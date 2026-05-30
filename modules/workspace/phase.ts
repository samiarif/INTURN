const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Active 0-based phase index for the current week. Returns 0 when there is no
 * start date or no phases, and clamps to the last phase once past the arc
 * (never returns -1).
 */
export function computeCurrentPhase(
  phases: Array<{ fromWeek: number; toWeek: number }>,
  startDate: Date | null,
  now = new Date(),
): number {
  if (!startDate || phases.length === 0) return 0;
  const elapsedWeeks = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1;
  for (let i = 0; i < phases.length; i++) {
    if (elapsedWeeks >= phases[i].fromWeek && elapsedWeeks <= phases[i].toWeek) return i;
  }
  // Past the last phase → consider the project at handoff.
  return Math.max(0, phases.length - 1);
}
