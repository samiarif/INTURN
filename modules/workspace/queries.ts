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
} from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
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

export async function getWorkspaceOverview(workspaceId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) return null;

  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, workspace.internshipId))
    .limit(1);

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, workspace.organizationId))
    .limit(1);

  const [intern] = await db.select().from(users).where(eq(users.id, workspace.internId)).limit(1);
  const [internProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, workspace.internId))
    .limit(1);

  let project = null;
  if (internship?.projectId) {
    const [p] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, internship.projectId))
      .limit(1);
    project = p ?? null;
  }

  const supervisorIds = project?.supervisorIds ?? [];
  const supervisorUserIds =
    supervisorIds.length > 0
      ? supervisorIds
      : ([organization?.ownerId].filter(Boolean) as string[]);
  const supervisors =
    supervisorUserIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, supervisorUserIds))
      : [];

  const workspaceTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))
    .orderBy(tasks.order)
    .limit(20);

  const workspaceDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.workspaceId, workspaceId))
    .limit(10);

  const taskIds = workspaceTasks.map((t) => t.id);
  const deliverableIds = workspaceDeliverables.map((d) => d.id);
  const targetIds = [workspaceId, ...taskIds, ...deliverableIds];

  const recentEvents =
    targetIds.length > 0
      ? await db
          .select()
          .from(events)
          .where(inArray(events.targetId, targetIds))
          .orderBy(desc(events.createdAt))
          .limit(10)
      : [];

  return {
    workspace,
    internship,
    organization,
    project,
    intern,
    internProfile,
    supervisors,
    tasks: workspaceTasks,
    deliverables: workspaceDeliverables,
    events: recentEvents,
  };
}

export type WorkspaceOverviewData = NonNullable<Awaited<ReturnType<typeof getWorkspaceOverview>>>;

export async function getInternSidebarData(internUserId: string): Promise<SidebarData> {
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
}

export async function getSupervisorSidebarData(supervisorUserId: string): Promise<SidebarData> {
  const orgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, supervisorUserId));

  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) return { role: 'supervisor', activeProjects: [] };

  const allProjects = await db
    .select()
    .from(projects)
    .where(inArray(projects.organizationId, orgIds));
  const allInternships = await db
    .select()
    .from(internships)
    .where(inArray(internships.organizationId, orgIds));
  const allWorkspaces = await db
    .select()
    .from(workspaces)
    .where(inArray(workspaces.organizationId, orgIds));
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
}
