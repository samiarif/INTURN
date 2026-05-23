import { describe, it, expect } from 'vitest';
import { computeDaysRemaining, computeWeekOfTotal } from '../queries';

describe('workspace derived fields', () => {
  it('computes days remaining', () => {
    const today = new Date('2026-05-23');
    const end = new Date('2026-07-25');
    expect(computeDaysRemaining(end, today)).toBe(63);
  });

  it('returns 0 days remaining when endDate is null', () => {
    expect(computeDaysRemaining(null, new Date())).toBe(0);
  });

  it('returns 0 days remaining when endDate is in the past', () => {
    const today = new Date('2026-05-23');
    const past = new Date('2026-01-01');
    expect(computeDaysRemaining(past, today)).toBe(0);
  });

  it('computes week N of M', () => {
    const start = new Date('2026-05-05');
    const today = new Date('2026-05-23');
    expect(computeWeekOfTotal(start, 12, today)).toEqual({ current: 3, total: 12 });
  });

  it('clamps current week to total', () => {
    const start = new Date('2026-01-01');
    const today = new Date('2026-12-31');
    expect(computeWeekOfTotal(start, 12, today).current).toBe(12);
  });

  it('returns 0 / total when startDate is null', () => {
    expect(computeWeekOfTotal(null, 12)).toEqual({ current: 0, total: 12 });
  });
});
