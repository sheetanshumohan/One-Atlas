import { Prisma } from '@prisma/client';
import { classifyPriceChange, PriceSnapshot } from './pricing.service';

const snap = (over: Partial<PriceSnapshot> = {}): PriceSnapshot => ({
  inputPricePerMTok: 2.5, outputPricePerMTok: 10, cachedInputPerMTok: null, isAvailable: true, ...over,
});

describe('classifyPriceChange', () => {
  it('new offering → CREATED; removed offering → REMOVED; nothing → null', () => {
    expect(classifyPriceChange(null, snap())).toBe('CREATED');
    expect(classifyPriceChange(snap(), null)).toBe('REMOVED');
    expect(classifyPriceChange(null, null)).toBeNull();
  });

  it('identical data is not an event (re-saving / re-ingesting writes no history)', () => {
    expect(classifyPriceChange(snap(), snap())).toBeNull();
  });

  it('compares decimals by value, not representation', () => {
    expect(classifyPriceChange(snap({ inputPricePerMTok: new Prisma.Decimal('2.500000') }), snap({ inputPricePerMTok: 2.5 }))).toBeNull();
    expect(classifyPriceChange(snap({ outputPricePerMTok: '10' }), snap({ outputPricePerMTok: new Prisma.Decimal(10) }))).toBeNull();
  });

  it.each([
    ['input price', { inputPricePerMTok: 2.4 }],
    ['output price', { outputPricePerMTok: 12 }],
    ['cached price added', { cachedInputPerMTok: 1.25 }],
    ['availability', { isAvailable: false }],
  ])('a change in %s → UPDATED', (_, over) => {
    expect(classifyPriceChange(snap(), snap(over as Partial<PriceSnapshot>))).toBe('UPDATED');
  });

  it('cached price removed (value → null) → UPDATED', () => {
    expect(classifyPriceChange(snap({ cachedInputPerMTok: 1 }), snap({ cachedInputPerMTok: null }))).toBe('UPDATED');
  });

  it('tiny sub-cent differences are real changes (exact decimals)', () => {
    expect(classifyPriceChange(snap({ inputPricePerMTok: '0.000001' }), snap({ inputPricePerMTok: '0.000002' }))).toBe('UPDATED');
  });
});
