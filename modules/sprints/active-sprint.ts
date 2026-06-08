export type SprintProgress = { total: number; done: number };
export type SprintForResolver = {
  id: string;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
};

/**
 * Returns the array INDEX (position) of the active sprint within `sprints`
 * when ordered ascending by orderIndex, or null if there are no sprints.
 * Pure — no DB, no clock. `today` and `progress` are supplied by the caller.
 *
 * The returned number is a POSITION, not an orderIndex value. Callers pass (and
 * index into) a sprints array sorted ascending by orderIndex — e.g. the result
 * of getSprintsForWorkspace. This is robust to non-contiguous orderIndex values
 * (e.g. after a sprint is deleted and not re-compacted), unlike returning the
 * orderIndex directly.
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

  // Rule 1: today within [startDate, endDate]; first match in ascending
  // orderIndex order = lowest orderIndex.
  const rule1 = ordered.findIndex((s) => {
    if (!s.startDate || !s.endDate) return false;
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    return today >= start && today <= end;
  });
  if (rule1 !== -1) return rule1;

  // Rule 2: first with any non-done task.
  const rule2 = ordered.findIndex((s) => {
    const p = progress.get(s.id);
    return !!p && p.total > 0 && p.done < p.total;
  });
  if (rule2 !== -1) return rule2;

  // Rule 3: fall back to the last sprint.
  return ordered.length - 1;
}
