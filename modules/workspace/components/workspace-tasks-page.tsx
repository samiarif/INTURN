import { WorkspaceTopBar, type Crumb } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceMHead } from './m-head';
import { StuckPill } from './stuck-pill';
import { TasksBoard } from './tasks-board';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceOverviewData } from '../queries';
import type { SidebarData, WorkspaceView } from '../types';

function buildCrumbs(data: WorkspaceOverviewData, view: WorkspaceView): Crumb[] {
  const projectOrInternship = data.project?.name ?? data.internship?.title ?? '—';
  if (view === 'intern') {
    return [
      { label: 'My workspaces' },
      { label: `${data.organization?.name ?? '—'} · ${projectOrInternship}` },
      { label: 'Tasks', bold: true },
    ];
  }
  return [
    { label: data.organization?.name ?? '—' },
    { label: projectOrInternship },
    { label: data.intern?.firstName ?? '—' },
    { label: 'Tasks', bold: true },
  ];
}

function buildModeChip(data: WorkspaceOverviewData): { label: string } {
  const start = data.workspace.startDate ? new Date(data.workspace.startDate) : null;
  const durationWeeks = data.internship?.duration ?? 12;
  const { current, total } = computeWeekOfTotal(start, durationWeeks);
  const locationType = (data.internship?.locationType ?? 'hybrid').toUpperCase();
  return { label: `${locationType} · WEEK ${current} / ${total}` };
}

export function WorkspaceTasksPage({
  data,
  view,
  sidebar,
  viewer,
  basePath,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  sidebar: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
  basePath: string;
}) {
  const internName =
    `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'the intern';
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
          <WorkspaceMHead
            view={view}
            basePath={basePath}
            activeTab="tasks"
            internFirstName={data.intern?.firstName ?? null}
            internLastName={data.intern?.lastName ?? null}
            internshipTitle={data.internship?.title ?? ''}
            startDate={data.workspace.startDate ? new Date(data.workspace.startDate) : null}
            endDate={data.workspace.endDate ? new Date(data.workspace.endDate) : null}
            taskCount={data.tasks.length}
            deliverableCount={data.deliverables.length}
          />
          <div
            className="ws-content"
            style={{ gridTemplateColumns: '1fr', paddingTop: 20, paddingBottom: 40 }}
          >
            <TasksBoard tasks={data.tasks} view={view} internName={internName} />
          </div>
        </main>
      </div>
      {view === 'intern' && <StuckPill />}
    </div>
  );
}
