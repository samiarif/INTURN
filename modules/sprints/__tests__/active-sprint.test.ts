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
});
