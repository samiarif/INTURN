import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { workspaces, internships, organizations, projects } from '@/db/schema';
import { computeCurrentPhase } from '@/modules/workspace/phase';
import { computeWeekOfTotal } from '@/modules/workspace/queries';

/**
 * The ONLY phase-visibility surface a coordinator gets. A separate read path
 * that physically cannot return private workspace columns (tasks, deliverables,
 * comments, brief, goals, phase descriptions, raw week boundaries) — structural
 * isolation, NOT post-fetch filtering. Returns null for a managed-but-unplaced
 * student. The coordinator never passes canViewWorkspace.
 *
 * Caller is responsible for the membership gate (only call for a student you
 * manage) — this read does no auth itself, matching the queries layer convention.
 */
export type StudentInternshipSnapshot = {
  companyName: string;
  internshipTitle: string;
  startDate: string | null;
  endDate: string | null;
  durationWeeks: number;
  status: string | null;
  currentPhaseIndex: number;
  phaseCount: number;
  phaseNames: string[];
  weekCurrent: number;
  weekTotal: number;
};

export async function getStudentInternshipSnapshot(
  studentUserId: string,
): Promise<StudentInternshipSnapshot | null> {
  // 1. Most-recent workspace for this student + the SAFE company/internship fields.
  const [ws] = await db
    .select({
      workspaceId: workspaces.id,
      status: workspaces.status,
      startDate: workspaces.startDate,
      endDate: workspaces.endDate,
      durationWeeks: internships.duration,
      companyName: organizations.name,
      internshipTitle: internships.title,
      projectId: internships.projectId,
    })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .where(eq(workspaces.internId, studentUserId))
    .orderBy(desc(workspaces.createdAt))
    .limit(1);

  if (!ws) return null; // managed but not yet placed

  // 2. Phase NAMES only (+ project startDate for the phase clock). Never brief/goals.
  let phaseNames: string[] = [];
  let phaseArc: Array<{ fromWeek: number; toWeek: number }> = [];
  let phaseStart: Date | null = ws.startDate ? new Date(ws.startDate) : null;
  if (ws.projectId) {
    const [proj] = await db
      .select({ phases: projects.phases, startDate: projects.startDate })
      .from(projects)
      .where(eq(projects.id, ws.projectId))
      .limit(1);
    const phases = (proj?.phases ?? []) as Array<{
      name: string;
      fromWeek: number;
      toWeek: number;
    }>;
    phaseNames = phases.map((p) => p.name);
    phaseArc = phases.map((p) => ({ fromWeek: p.fromWeek, toWeek: p.toWeek }));
    if (proj?.startDate) phaseStart = new Date(proj.startDate);
  }

  const durationWeeks = ws.durationWeeks ?? 0;
  const { current: weekCurrent, total: weekTotal } = computeWeekOfTotal(
    phaseStart,
    durationWeeks,
  );

  return {
    companyName: ws.companyName,
    internshipTitle: ws.internshipTitle,
    startDate: ws.startDate,
    endDate: ws.endDate,
    durationWeeks,
    status: ws.status,
    currentPhaseIndex: computeCurrentPhase(phaseArc, phaseStart),
    phaseCount: phaseNames.length,
    phaseNames,
    weekCurrent,
    weekTotal,
  };
}
