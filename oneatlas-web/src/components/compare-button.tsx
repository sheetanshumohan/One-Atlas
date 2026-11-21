'use client';

import { useCompare } from './compare-context';

export function CompareButton({ slug, name, size = 'sm' }: { slug: string; name: string; size?: 'sm' | 'md' }) {
  const compare = useCompare();
  const active = compare.has(slug);
  const disabled = !active && compare.full;
  return (
    <button
      type="button"
      onClick={() => compare.toggle({ slug, name })}
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? `You can compare up to ${compare.max} models at once` : active ? 'Remove from comparison' : 'Add to comparison'}
      className={`${active ? 'btn-primary' : 'btn-secondary'} ${size === 'sm' ? '!rounded-lg !px-2.5 !py-1 text-xs' : ''}`}
      data-testid={`compare-${slug}`}
    >
      {active ? '✓ Comparing' : '+ Compare'}
    </button>
  );
}
