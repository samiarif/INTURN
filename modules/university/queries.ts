import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  workspaces,
  internships,
  organizations,
  projects,
  organizationMembers,
  users,
  profiles,
} from '@/db/schema';
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

export type ManagedStudent = {
  memberId: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  invitedAt: Date;
  joinedAt: Date | null;
  assignedCoordinatorId: string | null;
  encadrantName: string | null;
};

/**
 * Active student-role members of a university org, joined to the user + their
 * profile (field/university for the roster card). Staff members (owner/admin)
 * are excluded — this is the supervised-students list only.
 *
 * Pass `forCoordinatorId` to restrict results to students assigned to that
 * coordinator (encadrant view). Omit for the head's full roster.
 */
export async function getManagedStudents(
  universityOrgId: string,
  opts?: { forCoordinatorId?: string },
): Promise<ManagedStudent[]> {
  const encadrant = alias(users, 'encadrant');
  const where = [
    eq(organizationMembers.organizationId, universityOrgId),
    eq(organizationMembers.role, 'student'),
    eq(organizationMembers.status, 'active'),
  ];
  if (opts?.forCoordinatorId) {
    where.push(eq(organizationMembers.assignedCoordinatorId, opts.forCoordinatorId));
  }

  const rows = await db
    .select({
      memberId: organizationMembers.id,
      userId: organizationMembers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: organizationMembers.email,
      imageUrl: users.imageUrl,
      university: profiles.university,
      fieldOfStudy: profiles.fieldOfStudy,
      invitedAt: organizationMembers.invitedAt,
      joinedAt: organizationMembers.joinedAt,
      assignedCoordinatorId: organizationMembers.assignedCoordinatorId,
      encadrantFirstName: encadrant.firstName,
      encadrantLastName: encadrant.lastName,
    })
    .from(organizationMembers)
    .leftJoin(users, eq(users.id, organizationMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, organizationMembers.userId))
    .leftJoin(encadrant, eq(encadrant.id, organizationMembers.assignedCoordinatorId))
    .where(and(...where))
    .orderBy(desc(organizationMembers.joinedAt))
    .limit(500);

  return rows.map((r) => ({
    memberId: r.memberId,
    userId: r.userId,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    imageUrl: r.imageUrl,
    university: r.university,
    fieldOfStudy: r.fieldOfStudy,
    invitedAt: r.invitedAt,
    joinedAt: r.joinedAt,
    assignedCoordinatorId: r.assignedCoordinatorId ?? null,
    encadrantName: [r.encadrantFirstName, r.encadrantLastName].filter(Boolean).join(' ') || null,
  }));
}

export type UniversityRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  createdAt: Date;
};

/** All university orgs, newest first — backs the admin /admin/universities list. */
export async function listUniversities(): Promise<UniversityRow[]> {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      city: organizations.city,
      country: organizations.country,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.kind, 'university'))
    .orderBy(desc(organizations.createdAt));
  return rows as UniversityRow[];
}
