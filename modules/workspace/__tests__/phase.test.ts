import { describe, it, expect } from 'vitest';
import { computeCurrentPhase } from '../phase';

// Fixed "now" so week math is deterministic. startDate at day 0; each phase
// is a [fromWeek, toWeek] inclusive window on the 1-based project clock.
const start = new Date('2026-01-01T00:00:00Z');
const phases = [
  { fromWeek: 1, toWeek: 2 },
  { fromWeek: 3, toWeek: 4 },
  { fromWeek: 5, toWeek: 6 },
];
const dayMs = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(start.getTime() + days * dayMs);

describe('computeCurrentPhase', () => {
  it('returns 0 when there is no startDate', () => {
    expect(computeCurrentPhase(phases, null, at(20))).toBe(0);
  });

  it('returns 0 when there are no phases', () => {
    expect(computeCurrentPhase([], start, at(20))).toBe(0);
  });

  it('returns phase 0 in week 1 (day 0)', () => {
    expect(computeCurrentPhase(phases, start, at(0))).toBe(0);
  });

  it('returns phase 0 at the week 1→2 boundary (still phase 0)', () => {
    // day 8 → elapsedWeeks = floor(8/7)+1 = 2 → within [1,2] → phase 0
    expect(computeCurrentPhase(phases, start, at(8))).toBe(0);
  });

  it('returns phase 1 in week 3 (day 14 → week 3)', () => {
    // day 14 → floor(14/7)+1 = 3 → within [3,4] → phase 1
    expect(computeCurrentPhase(phases, start, at(14))).toBe(1);
  });

  it('returns phase 2 in week 5', () => {
    // day 28 → floor(28/7)+1 = 5 → within [5,6] → phase 2
    expect(computeCurrentPhase(phases, start, at(28))).toBe(2);
  });

  it('clamps to the last phase past the end of the arc', () => {
    // day 70 → week 11, beyond all windows → max(0, len-1) = 2
    expect(computeCurrentPhase(phases, start, at(70))).toBe(2);
  });
});
