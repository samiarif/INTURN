export type SprintProgress = { total: number; done: number };
export type SprintForResolver = {
  id: string;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
};

/**
 * Returns the orderIndex of the active sprint, or null if there are no sprints.
 * Pure — no DB, no clock. `today` and `progress` are supplied by the caller.
 *
 * Rules (in order):
 *   1) today between sprint.startDate..endDate → that sprint. Multiple match
 *      → lowest orderIndex.
 *   2) Otherwise → the first sprint (by orderIndex) with any non-done task.
 *   3) Otherwise (all done, or no tasks at all) → the last sprint.
 */
export function resolveActiveSprintIndex(
  sprints: SprintForResolver[],
  today: Date,
  progress: Map<string, SprintProgress>,
): number | null {
  if (sprints.length === 0) return null;
  const ordered = [...sprints].sort((a, b) => a.orderIndex - b.orderIndex);

  // Rule 1: today within [startDate, endDate]
  const dateMatches = ordered.filter((s) => {
    if (!s.startDate || !s.endDate) return false;
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    return today >= start && today <= end;
  });
  if (dateMatches.length > 0) return dateMatches[0].orderIndex;

  // Rule 2: first with any non-done task
  for (const s of ordered) {
    const p = progress.get(s.id);
    if (p && p.total > 0 && p.done < p.total) return s.orderIndex;
  }

  // Rule 3: fall back to last
  return ordered[ordered.length - 1].orderIndex;
}
