import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { canViewWorkspace } from './service';
import {
  getWorkspaceOverview,
  getInternSidebarData,
  getSupervisorSidebarData,
  type WorkspaceOverviewData,
} from './queries';
import { db } from '@/db';
import {
  workspaces,
  internships,
  projects,
  organizations,
  users,
  profiles,
  tasks,
  deliverables,
} from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import type { SidebarData, WorkspaceView, UserRole } from './types';
import type { Session } from '@/modules/auth/session';

export type WorkspaceShell = {
  session: Session;
  workspaceId: string;
  view: WorkspaceView;
  sidebar: SidebarData;
  basePath: string;
  viewer: { initials: string; name: string; subtitle: string };
  shell: {
    workspaceId: string;
    organizationName: string;
    projectOrInternshipLabel: string;
    internFirstName: string | null;
    internLastName: string | null;
    internshipTitle: string;
    locationType: string;
    durationWeeks: number;
    startDate: Date | null;
    endDate: Date | null;
    taskCount: number;
    deliverableCount: number;
  };
};

export type WorkspacePageData = {
  session: Session;
  data: WorkspaceOverviewData;
  sidebar: SidebarData;
  view: WorkspaceView;
  basePath: string;
  viewer: { initials: string; name: string; subtitle: string };
};

/**
 * Shell loader: session + authz + sidebar + just-enough-workspace-metadata to
 * paint topbar + MHead + sidebar. The heavy `getWorkspaceOverview` runs
 * separately via `loadWorkspaceData`, so the body can stream while the shell
 * is already on screen.
 *
 * Cost target: one indexed workspace join + two SELECT COUNT(*) (both on
 * workspace_id, both indexed) + one sidebar query, all in parallel. ~3-4
 * fast roundtrips total before the shell is paintable.
 */
export async function loadWorkspaceShell(
  workspaceId: string,
  view: WorkspaceView,
): Promise<WorkspaceShell> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const shellRowPromise = db
    .select({
      workspaceId: workspaces.id,
      internshipId: workspaces.internshipId,
      organizationId: workspaces.organizationId,
      projectId: internships.projectId,
      internId: workspaces.internId,
      startDate: workspaces.startDate,
      endDate: workspaces.endDate,
      orgName: organizations.name,
      orgOwnerId: organizations.ownerId,
      projectName: projects.name,
      internshipTitle: internships.title,
      locationType: internships.locationType,
      duration: internships.duration,
      supervisorIds: projects.supervisorIds,
      internFirstName: users.firstName,
      internLastName: users.lastName,
      internUniversity: profiles.university,
      internYear: profiles.yearOfStudy,
    })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .leftJoin(projects, eq(projects.id, internships.projectId))
    .innerJoin(users, eq(users.id, workspaces.internId))
    .leftJoin(profiles, eq(profiles.userId, workspaces.internId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1)
    .then((rows) => rows[0]);

  const taskCountPromise = db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))
    .then((rows) => rows[0]?.value ?? 0);

  const deliverableCountPromise = db
    .select({ value: count() })
    .from(deliverables)
    .where(eq(deliverables.workspaceId, workspaceId))
    .then((rows) => rows[0]?.value ?? 0);

  // Sidebar pulls from viewer identity, not the current workspace — so we can
  // kick it off in parallel with everything else.
  const sidebarSeedPromise: Promise<SidebarData> =
    view === 'intern'
      ? getInternSidebarData(session.user.id)
      : getSupervisorSidebarData(session.user.id);

  const [row, taskCount, deliverableCount, sidebarSeed] = await Promise.all([
    shellRowPromise,
    taskCountPromise,
    deliverableCountPromise,
    sidebarSeedPromise,
  ]);

  if (!row) notFound();

  // canViewWorkspace only inspects internId + supervisorIds, so a minimal
  // shape is enough here.
  const minimalWorkspace = {
    id: row.workspaceId,
    internId: row.internId,
    internshipId: row.internshipId,
    organizationId: row.organizationId,
    status: 'active',
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Parameters<typeof canViewWorkspace>[0];
  const minimalProject = row.projectId
    ? ({
        id: row.projectId,
        supervisorIds: row.supervisorIds ?? [],
      } as Parameters<typeof canViewWorkspace>[1])
    : null;

  if (
    !canViewWorkspace(minimalWorkspace, minimalProject, {
      userId: session.user.id,
      role: session.role as UserRole,
    })
  ) {
    notFound();
  }

  // Admin viewing a supervisor workspace sees the workspace's org owner sidebar.
  const sidebar =
    view === 'supervisor' && session.role === 'admin' && row.orgOwnerId
      ? await getSupervisorSidebarData(row.orgOwnerId)
      : sidebarSeed;

  const viewer =
    view === 'intern'
      ? {
          initials: `${row.internFirstName?.[0] ?? ''}${row.internLastName?.[0] ?? ''}`,
          name: `${row.internFirstName ?? ''} ${row.internLastName ?? ''}`.trim() || 'Intern',
          subtitle: `${row.internUniversity ?? ''} · ${row.internYear ?? ''}`.trim(),
        }
      : {
          initials: 'AD',
          name: 'Supervisor',
          subtitle: row.orgName,
        };

  const basePath =
    view === 'intern'
      ? `/intern/workspaces/${row.workspaceId}`
      : `/company/workspaces/${row.workspaceId}`;

  return {
    session,
    workspaceId: row.workspaceId,
    view,
    sidebar,
    basePath,
    viewer,
    shell: {
      workspaceId: row.workspaceId,
      organizationName: row.orgName,
      projectOrInternshipLabel: row.projectName ?? row.internshipTitle,
      internFirstName: row.internFirstName,
      internLastName: row.internLastName,
      internshipTitle: row.internshipTitle,
      locationType: (row.locationType ?? 'hybrid').toUpperCase(),
      durationWeeks: row.duration ?? 12,
      startDate: row.startDate ? new Date(row.startDate) : null,
      endDate: row.endDate ? new Date(row.endDate) : null,
      taskCount,
      deliverableCount,
    },
  };
}

/**
 * Heavy loader: full workspace overview (tasks, deliverables, events,
 * supervisors, intern profile, project). Called inside an async server
 * component wrapped in <Suspense> so the body streams independently of
 * the shell.
 *
 * Re-runs authz — defense in depth if a caller forgets the shell pass.
 */
export async function loadWorkspaceData(workspaceId: string): Promise<WorkspaceOverviewData> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();
  if (
    !canViewWorkspace(data.workspace, data.project, {
      userId: session.user.id,
      role: session.role,
    })
  ) {
    notFound();
  }
  return data;
}

/**
 * Non-streaming loader for tabs (tasks, deliverables, comments, check-in).
 * Kept as-is from the previous audit — those tabs have their own loading.tsx
 * skeletons during nav and the overview-specific Suspense split doesn't help.
 */
export async function loadWorkspacePage(
  workspaceId: string,
  view: WorkspaceView,
): Promise<WorkspacePageData> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();

  if (
    !canViewWorkspace(data.workspace, data.project, {
      userId: session.user.id,
      role: session.role,
    })
  ) {
    notFound();
  }

  const sidebar =
    view === 'intern'
      ? await getInternSidebarData(data.workspace.internId)
      : await getSupervisorSidebarData(
          session.role === 'admin'
            ? (data.organization?.ownerId ?? session.user.id)
            : session.user.id,
        );

  const viewer =
    view === 'intern'
      ? {
          initials: `${data.intern?.firstName?.[0] ?? ''}${data.intern?.lastName?.[0] ?? ''}`,
          name:
            `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'Intern',
          subtitle:
            `${data.internProfile?.university ?? ''} · ${data.internProfile?.yearOfStudy ?? ''}`.trim(),
        }
      : (() => {
          const supervisor = data.supervisors[0];
          return {
            initials: supervisor
              ? `${supervisor.firstName?.[0] ?? ''}${supervisor.lastName?.[0] ?? ''}`
              : 'AD',
            name: supervisor
              ? `${supervisor.firstName ?? ''} ${supervisor.lastName ?? ''}`.trim()
              : 'Admin',
            subtitle: data.organization?.name ?? '',
          };
        })();

  const basePath =
    view === 'intern'
      ? `/intern/workspaces/${data.workspace.id}`
      : `/company/workspaces/${data.workspace.id}`;

  return { session, data, sidebar, view, basePath, viewer };
}
