import { describe, it, expect } from 'vitest';
import { resolveActiveSprintIndex, type SprintProgress } from '../active-sprint';

type S = { id: string; orderIndex: number; startDate: string | null; endDate: string | null };

const today = new Date('2026-06-05');

describe('resolveActiveSprintIndex', () => {
  it('returns null when there are no sprints', () => {
    expect(resolveActiveSprintIndex([], today, new Map())).toBeNull();
  });

  it('rule 1 — today between start and end picks that sprint', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: '2026-05-01', endDate: '2026-05-31' },
      { id: 'b', orderIndex: 1, startDate: '2026-06-01', endDate: '2026-06-30' },
    ];
    expect(resolveActiveSprintIndex(sprints, today, new Map())).toBe(1);
  });

  it('rule 1 tie-break — overlapping dates → lowest orderIndex wins', () => {
    const sprints: S[] = [
      { id: 'b', orderIndex: 1, startDate: '2026-05-01', endDate: '2026-06-30' },
      { id: 'a', orderIndex: 0, startDate: '2026-06-01', endDate: '2026-06-30' },
    ];
    expect(resolveActiveSprintIndex(sprints, today, new Map())).toBe(0);
  });

  it('rule 2 — no dates: first sprint with non-done tasks', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: null, endDate: null },
      { id: 'b', orderIndex: 1, startDate: null, endDate: null },
    ];
    const progress = new Map<string, SprintProgress>([
      ['a', { total: 2, done: 2 }],   // all done
      ['b', { total: 3, done: 1 }],   // has non-done
    ]);
    expect(resolveActiveSprintIndex(sprints, today, progress)).toBe(1);
  });

  it('rule 2 — between sprints by date: first incomplete', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: '2026-01-01', endDate: '2026-02-01' },
      { id: 'b', orderIndex: 1, startDate: '2026-09-01', endDate: '2026-10-01' },
    ];
    const progress = new Map<string, SprintProgress>([
      ['a', { total: 2, done: 0 }],
      ['b', { total: 0, done: 0 }],
    ]);
    expect(resolveActiveSprintIndex(sprints, today, progress)).toBe(0);
  });

  it('rule 3 — all sprints done: last sprint', () => {
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: null, endDate: null },
      { id: 'b', orderIndex: 1, startDate: null, endDate: null },
    ];
    const progress = new Map<string, SprintProgress>([
      ['a', { total: 2, done: 2 }],
      ['b', { total: 1, done: 1 }],
    ]);
    expect(resolveActiveSprintIndex(sprints, today, progress)).toBe(1);
  });

  it('non-contiguous orderIndex (after a mid-sprint deletion) returns the array POSITION, not the orderIndex value', () => {
    // Sprints with orderIndex 0 and 2 remain after the orderIndex-1 sprint was
    // deleted (deleteSprint does not re-compact). All tasks done → rule 3 → the
    // LAST sprint, whose array POSITION is 1 (its orderIndex is 2).
    const sprints: S[] = [
      { id: 'a', orderIndex: 0, startDate: null, endDate: null },
      { id: 'c', orderIndex: 2, startDate: null, endDate: null },
    ];
    const progress = new Map<string, SprintProgress>([
      ['a', { total: 1, done: 1 }],
      ['c', { total: 1, done: 1 }],
    ]);
    expect(resolveActiveSprintIndex(sprints, today, progress)).toBe(1);
  });
});
