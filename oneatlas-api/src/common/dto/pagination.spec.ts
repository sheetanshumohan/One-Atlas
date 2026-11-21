import { pageArgs, paginate } from './pagination.dto';

describe('pagination', () => {
  it('computes skip/take', () => {
    expect(pageArgs({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
    expect(pageArgs({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('builds meta for a middle page', () => {
    expect(paginate([1, 2], 5, { page: 2, pageSize: 2 }).meta).toEqual({
      page: 2, pageSize: 2, total: 5, totalPages: 3, hasNextPage: true, hasPreviousPage: true,
    });
  });

  it('last page has no next page', () => {
    const { meta } = paginate([5], 5, { page: 3, pageSize: 2 });
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
  });

  it('empty result set', () => {
    expect(paginate([], 0, { page: 1, pageSize: 20 }).meta).toEqual({
      page: 1, pageSize: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false,
    });
  });

  it('page beyond the end returns empty data but correct totals', () => {
    const r = paginate([], 5, { page: 10, pageSize: 2 });
    expect(r.data).toEqual([]);
    expect(r.meta).toMatchObject({ total: 5, totalPages: 3, hasNextPage: false, hasPreviousPage: true });
  });

  it('exact multiple of page size', () => {
    expect(paginate([], 40, { page: 1, pageSize: 20 }).meta.totalPages).toBe(2);
  });
});
