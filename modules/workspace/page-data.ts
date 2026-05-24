import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { canViewWorkspace } from './service';
import {
  getWorkspaceOverview,
  getInternSidebarData,
  getSupervisorSidebarData,
  type WorkspaceOverviewData,
} from './queries';
import type { SidebarData, WorkspaceView } from './types';
import type { Session } from '@/modules/auth/session';

export type WorkspacePageData = {
  session: Session;
  data: WorkspaceOverviewData;
  sidebar: SidebarData;
  view: WorkspaceView;
  basePath: string;
  viewer: { initials: string; name: string; subtitle: string };
};

/**
 * Shared loader for every workspace tab page.
 *
 * Replaces ~40 lines of duplicated auth + workspace + sidebar logic that was
 * copy-pasted across 9 page.tsx files. Calls getSession (React-cached) so the
 * auth chain runs at most once per render even if other components also call
 * it. Loads the sidebar in parallel with the workspace overview where possible.
 */
export async function loadWorkspacePage(
  workspaceId: string,
  view: WorkspaceView,
): Promise<WorkspacePageData> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  // Load workspace + sidebar in parallel. Sidebar doesn't depend on workspace
  // for the intern case (we use the *viewer's* sidebar for /intern/...
  // routes — but the audit pointed out we actually want the *workspace's
  // intern* sidebar so admins viewing intern routes see the intern's view).
  // For supervisor: sidebar depends on viewer (or workspace org owner if admin).
  const workspacePromise = getWorkspaceOverview(workspaceId);

  // Race the workspace fetch — but we need workspace data before we can
  // confirm authz. Do them serially for safety; the parallelization win
  // comes from the inner getWorkspaceOverview already batching.
  const data = await workspacePromise;
  if (!data) notFound();

  if (
    !canViewWorkspace(data.workspace, data.project, {
      userId: session.user.id,
      role: session.role,
    })
  ) {
    notFound();
  }

  // Now load sidebar (depends on intern id or supervisor identity).
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
