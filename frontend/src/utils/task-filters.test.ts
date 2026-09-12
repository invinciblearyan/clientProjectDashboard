import { describe, expect, it } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import { parseTaskFiltersFromSearchParams } from './task-filters';

describe('parseTaskFiltersFromSearchParams', () => {
  it('returns no filters for an empty query string', () => {
    const result = parseTaskFiltersFromSearchParams(new URLSearchParams());

    expect(result.urlFilters).toEqual({});
    expect(result.apiParams).toEqual({});
    expect(result.hasActiveFilters).toBe(false);
    expect(result.dateRangeInvalid).toBe(false);
  });

  it('parses valid status and priority filters', () => {
    const params = new URLSearchParams({
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });

    const result = parseTaskFiltersFromSearchParams(params);

    expect(result.urlFilters).toEqual({
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });
    expect(result.apiParams).toEqual({
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });
    expect(result.hasActiveFilters).toBe(true);
  });

  it('converts dueFrom and dueTo to API datetime parameters', () => {
    const params = new URLSearchParams({
      dueFrom: '2026-09-01',
      dueTo: '2026-09-30',
    });

    const result = parseTaskFiltersFromSearchParams(params);

    expect(result.apiParams).toEqual({
      dueDateFrom: '2026-09-01T00:00:00.000Z',
      dueDateTo: '2026-09-30T23:59:59.999Z',
    });
  });

  it('ignores invalid status, priority, and date values', () => {
    const params = new URLSearchParams({
      status: 'BLOCKED',
      priority: 'URGENT',
      dueFrom: 'not-a-date',
      dueTo: '2026-13-40',
    });

    const result = parseTaskFiltersFromSearchParams(params);

    expect(result.urlFilters).toEqual({});
    expect(result.apiParams).toEqual({});
    expect(result.hasActiveFilters).toBe(false);
  });

  it('marks an inverted date range as invalid and ignores date API params', () => {
    const params = new URLSearchParams({
      dueFrom: '2026-09-30',
      dueTo: '2026-09-01',
    });

    const result = parseTaskFiltersFromSearchParams(params);

    expect(result.dateRangeInvalid).toBe(true);
    expect(result.apiParams).toEqual({});
    expect(result.hasActiveFilters).toBe(false);
  });

  it('builds distinct TanStack Query keys per filter set', () => {
    const unfilteredKey = queryKeys.tasks.byProject('project-1', { limit: 100 });
    const filteredKey = queryKeys.tasks.byProject('project-1', {
      limit: 100,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDateFrom: '2026-09-01T00:00:00.000Z',
      dueDateTo: '2026-09-30T23:59:59.999Z',
    });

    expect(unfilteredKey).not.toEqual(filteredKey);
  });
});
