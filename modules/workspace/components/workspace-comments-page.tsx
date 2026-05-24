import { WorkspaceTopBar, type Crumb } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceMHead } from './m-head';
import { StuckPill } from './stuck-pill';
import { CommentsThread } from './comments-thread';
import { getWorkspaceComments } from '@/modules/comments/queries';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceOverviewData } from '../queries';
import type { SidebarData, WorkspaceView } from '../types';

function buildCrumbs(data: WorkspaceOverviewData, view: WorkspaceView): Crumb[] {
  const projectOrInternship = data.project?.name ?? data.internship?.title ?? '—';
  if (view === 'intern') {
    return [
      { label: 'My workspaces' },
      { label: `${data.organization?.name ?? '—'} · ${projectOrInternship}` },
      { label: 'Comments', bold: true },
    ];
  }
  return [
    { label: data.organization?.name ?? '—' },
    { label: projectOrInternship },
    { label: data.intern?.firstName ?? '—' },
    { label: 'Comments', bold: true },
  ];
}

function buildModeChip(data: WorkspaceOverviewData): { label: string } {
  const start = data.workspace.startDate ? new Date(data.workspace.startDate) : null;
  const durationWeeks = data.internship?.duration ?? 12;
  const { current, total } = computeWeekOfTotal(start, durationWeeks);
  const locationType = (data.internship?.locationType ?? 'hybrid').toUpperCase();
  return { label: `${locationType} · WEEK ${current} / ${total}` };
}

export async function WorkspaceCommentsPage({
  data,
  view,
  sidebar,
  viewer,
  basePath,
  currentUserId,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  sidebar: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
  basePath: string;
  currentUserId: string;
}) {
  const comments = await getWorkspaceComments(data.workspace.id);
  return (
    <div
      className="ws-shell ws"
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <WorkspaceTopBar
        view={view}
        viewerInitials={viewer.initials}
        crumbs={buildCrumbs(data, view)}
        modeChip={buildModeChip(data)}
      />
      <div className="ws-body">
        <WorkspaceSidebar data={sidebar} viewer={viewer} activeWorkspaceId={data.workspace.id} />
        <main className="ws-main">
          <WorkspaceMHead data={data} view={view} basePath={basePath} activeTab="comments" />
          <div
            className="ws-content"
            style={{ gridTemplateColumns: '1fr', paddingTop: 20, paddingBottom: 40, maxWidth: 760, margin: '0 auto', width: '100%' }}
          >
            <CommentsThread
              workspaceId={data.workspace.id}
              comments={comments}
              currentUserId={currentUserId}
            />
          </div>
        </main>
      </div>
      {view === 'intern' && <StuckPill />}
    </div>
  );
}
