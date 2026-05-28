import { cache } from 'react';
import { db } from '@/db';
import {
  workspaces,
  internships,
  organizations,
  users,
  tasks,
  deliverables,
  events,
  profiles,
  projects,
  workspaceNotes,
  type WorkspaceNote,
} from '@/db/schema';
import { desc, eq, inArray, sql, or, and } from 'drizzle-orm';
import type { SidebarData } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeDaysRemaining(endDate: Date | null, now = new Date()): number {
  if (!endDate) return 0;
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}

export function computeWeekOfTotal(
  startDate: Date | null,
  durationWeeks: number,
  now = new Date(),
): { current: number; total: number } {
  if (!startDate) return { current: 0, total: durationWeeks };
  const elapsed = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1;
  return { current: Math.min(durationWeeks, Math.max(1, elapsed)), total: durationWeeks };
}

export const getWorkspaceOverview = cache(async (workspaceId: string) => {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) return null;

  // First parallel batch: everything that depends only on workspace FKs.
  const [
    [internship],
    [organization],
    [intern],
    [internProfile],
    workspaceTasks,
    workspaceDeliverables,
  ] = await Promise.all([
    db.select().from(internships).where(eq(internships.id, workspace.internshipId)).limit(1),
    db.select().from(organizations).where(eq(organizations.id, workspace.organizationId)).limit(1),
    db.select().from(users).where(eq(users.id, workspace.internId)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, workspace.internId)).limit(1),
    db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId))
      .orderBy(tasks.order)
      .limit(20),
    db.select().from(deliverables).where(eq(deliverables.workspaceId, workspaceId)).limit(10),
  ]);

  // Second batch: depends on internship + organization.
  const [project, supervisors, recentEvents] = await Promise.all([
    internship?.projectId
      ? db
          .select()
          .from(projects)
          .where(eq(projects.id, internship.projectId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    (async () => {
      // We don't know supervisorIds until project resolves, but most workspaces have
      // small org owners — load owner concurrently, then merge in project supervisors.
      const ownerId = organization?.ownerId;
      if (!ownerId) return [];
      return db.select().from(users).where(eq(users.id, ownerId));
    })(),
    (async () => {
      const taskIds = workspaceTasks.map((t) => t.id);
      const deliverableIds = workspaceDeliverables.map((d) => d.id);
      const targetIds = [workspaceId, ...taskIds, ...deliverableIds];
      if (targetIds.length === 0) return [];
      return db
        .select()
        .from(events)
        .where(inArray(events.targetId, targetIds))
        .orderBy(desc(events.createdAt))
        .limit(10);
    })(),
  ]);

  // Final pass: merge project.supervisorIds into supervisors list if they differ
  // from the org owner.
  let mergedSupervisors = supervisors;
  if (project?.supervisorIds && project.supervisorIds.length > 0) {
    const known = new Set(supervisors.map((s) => s.id));
    const missing = project.supervisorIds.filter((id) => !known.has(id));
    if (missing.length > 0) {
      const extras = await db.select().from(users).where(inArray(users.id, missing));
      mergedSupervisors = [...supervisors, ...extras];
    }
  }

  return {
    workspace,
    internship,
    organization,
    project,
    intern,
    internProfile,
    supervisors: mergedSupervisors,
    tasks: workspaceTasks,
    deliverables: workspaceDeliverables,
    events: recentEvents,
  };
});

export type WorkspaceOverviewData = NonNullable<Awaited<ReturnType<typeof getWorkspaceOverview>>>;

// React.cache so layout's loadWorkspaceShell + page's loadWorkspacePage
// share one DB hit per render (same userId arg → cache hit).
export const getInternSidebarData = cache(async (internUserId: string): Promise<SidebarData> => {
  const myWorkspaces = await db
    .select({
      id: workspaces.id,
      orgName: organizations.name,
      projectName: projects.name,
      internshipTitle: internships.title,
      status: workspaces.status,
    })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .leftJoin(projects, eq(projects.id, internships.projectId))
    .where(eq(workspaces.internId, internUserId));

  return {
    role: 'intern',
    activeWorkspaces: myWorkspaces.map((w) => ({
      id: w.id,
      label: `${w.orgName} · ${w.projectName ?? w.internshipTitle}`,
      live: w.status === 'active',
    })),
  };
});

export type TimelineRow =
  | {
      kind: 'event';
      id: string;
      at: Date;
      type: string;
      actorId: string | null;
      metadata: Record<string, unknown> | null;
    }
  | { kind: 'milestone'; id: string; at: Date; label: string };

export async function getWorkspaceTimeline(workspaceId: string): Promise<TimelineRow[]> {
  // Events in the workspace target either the workspace itself OR child
  // task/deliverable rows. Mirror getWorkspaceOverview's expand-then-IN pattern
  // so the timeline shows the whole feed, not just workspace-scoped events.
  const [ws, taskRows, deliverableRows] = await Promise.all([
    db
      .select({ id: workspaces.id, startDate: workspaces.startDate, endDate: workspaces.endDate })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)
      .then((r) => r[0]),
    db.select({ id: tasks.id }).from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    db
      .select({ id: deliverables.id })
      .from(deliverables)
      .where(eq(deliverables.workspaceId, workspaceId)),
  ]);

  const targetIds = [
    workspaceId,
    ...taskRows.map((t) => t.id),
    ...deliverableRows.map((d) => d.id),
  ];

  const eventRows = await db
    .select()
    .from(events)
    .where(inArray(events.targetId, targetIds))
    .orderBy(desc(events.createdAt))
    .limit(200);

  const rows: TimelineRow[] = eventRows.map((e) => ({
    kind: 'event' as const,
    id: e.id,
    at: e.createdAt,
    type: e.type,
    actorId: e.actorId,
    metadata: (e.metadata as Record<string, unknown> | null) ?? null,
  }));

  if (ws?.startDate) {
    rows.push({
      kind: 'milestone',
      id: `${workspaceId}:started`,
      at: new Date(ws.startDate),
      label: 'Workspace started',
    });
  }
  if (ws?.endDate) {
    rows.push({
      kind: 'milestone',
      id: `${workspaceId}:deadline`,
      at: new Date(ws.endDate),
      label: 'Deadline',
    });
  }

  rows.sort((a, b) => b.at.getTime() - a.at.getTime());
  return rows;
}

// React.cache so layout's loadWorkspaceShell + page's loadWorkspacePage
// share one DB hit per render (same userId arg → cache hit).
export const getSupervisorSidebarData = cache(async (supervisorUserId: string): Promise<SidebarData> => {
  // Query 1: projects where viewer is in supervisorIds (JSONB containment)
  // OR projects whose org is owned by viewer (legacy fallback for orgs created
  // before the supervisorIds plumbing landed).
  const supervisedProjects = await db
    .select()
    .from(projects)
    .leftJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(
      or(
        sql`${projects.supervisorIds} @> ${JSON.stringify([supervisorUserId])}::jsonb`,
        eq(organizations.ownerId, supervisorUserId),
      ),
    );

  if (supervisedProjects.length === 0) {
    return { role: 'supervisor', activeProjects: [] };
  }

  const allProjects = supervisedProjects.map((row) => row.projects);
  const orgIds = [...new Set(allProjects.map((p) => p.organizationId))];
  // allInternships and allWorkspaces both depend only on orgIds — run in parallel.
  const [allInternships, allWorkspaces] = await Promise.all([
    db.select().from(internships).where(inArray(internships.organizationId, orgIds)),
    db.select().from(workspaces).where(inArray(workspaces.organizationId, orgIds)),
  ]);
  // allInterns depends on internIds derived from allWorkspaces — must stay sequential.
  const internIds = allWorkspaces.map((w) => w.internId);
  const allInterns =
    internIds.length > 0 ? await db.select().from(users).where(inArray(users.id, internIds)) : [];
  const internsById = new Map(allInterns.map((u) => [u.id, u]));

  return {
    role: 'supervisor',
    activeProjects: allProjects.map((p) => {
      const projectInternships = allInternships.filter((i) => i.projectId === p.id);
      const projectInternshipIds = new Set(projectInternships.map((i) => i.id));
      const projectWorkspaces = allWorkspaces.filter((w) =>
        projectInternshipIds.has(w.internshipId),
      );
      const code = p.name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return {
        id: p.id,
        code,
        name: p.name,
        meta: p.status === 'draft' ? 'DRAFT' : '',
        status: (p.status === 'draft' ? 'draft' : 'active') as 'draft' | 'active',
        workspaces: projectWorkspaces.map((w) => {
          const intern = internsById.get(w.internId);
          const internship = projectInternships.find((i) => i.id === w.internshipId);
          return {
            id: w.id,
            label: `${intern?.firstName ?? ''} · ${internship?.title?.split('—')[0]?.trim() ?? ''}`,
            live: w.status === 'active',
          };
        }),
      };
    }),
  };
});

export type CompanyWorkspaceRow = {
  id: string;
  status: 'active' | 'completed' | 'cancelled' | null;
  internFirstName: string | null;
  internLastName: string | null;
  internshipTitle: string;
  projectTitle: string | null;
  startDate: string | null;
  endDate: string | null;
};

/**
 * All workspaces belonging to organizations owned by `ownerUserId` (the company
 * user) — feeds the /company/workspaces index (M4). Mirrors the workspace →
 * internship → organization → project join used in getInternSidebarData, but
 * pivots on organizations.ownerId instead of workspaces.internId, and joins the
 * intern's user row for the display name.
 *
 * Ordering: active workspaces first (active → others), then newest by createdAt.
 */
export async function listCompanyWorkspaces(
  ownerUserId: string,
): Promise<CompanyWorkspaceRow[]> {
  return db
    .select({
      id: workspaces.id,
      status: workspaces.status,
      internFirstName: users.firstName,
      internLastName: users.lastName,
      internshipTitle: internships.title,
      projectTitle: projects.name,
      startDate: workspaces.startDate,
      endDate: workspaces.endDate,
    })
    .from(workspaces)
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .innerJoin(users, eq(users.id, workspaces.internId))
    .leftJoin(projects, eq(projects.id, internships.projectId))
    .where(eq(organizations.ownerId, ownerUserId))
    .orderBy(
      // Active first; everything else after. Then newest workspace first.
      sql`case when ${workspaces.status} = 'active' then 0 else 1 end`,
      desc(workspaces.createdAt),
    );
}

/**
 * Author-private notes for a workspace, newest first.
 * Wrapped in React cache so the same (workspaceId, authorId) pair pays one
 * DB round-trip per RSC render tree.
 */
export const listMyWorkspaceNotes = cache(
  async (workspaceId: string, authorId: string): Promise<WorkspaceNote[]> => {
    return db
      .select()
      .from(workspaceNotes)
      .where(
        and(
          eq(workspaceNotes.workspaceId, workspaceId),
          eq(workspaceNotes.authorId, authorId),
        ),
      )
      .orderBy(desc(workspaceNotes.createdAt));
  },
);
