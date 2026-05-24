import { Suspense } from 'react';
import { WorkspaceTopBar, type Crumb } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceMHead } from './m-head';
import { WorkspaceOverviewBody } from './workspace-overview-body';
import { WorkspaceBodySkeleton } from './workspace-body-skeleton';
import { StuckPill } from './stuck-pill';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceShell } from '../page-data';

function buildShellCrumbs(
  shell: WorkspaceShell['shell'],
  view: WorkspaceShell['view'],
): Crumb[] {
  if (view === 'intern') {
    return [
      { label: 'My workspaces' },
      { label: `${shell.organizationName} · ${shell.projectOrInternshipLabel}` },
      { label: 'Overview', bold: true },
    ];
  }
  return [
    { label: shell.organizationName },
    { label: shell.projectOrInternshipLabel },
    { label: shell.internFirstName ?? '—' },
    { label: 'Overview', bold: true },
  ];
}

function buildShellModeChip(shell: WorkspaceShell['shell']): { label: string } {
  const { current, total } = computeWeekOfTotal(shell.startDate, shell.durationWeeks);
  return { label: `${shell.locationType} · WEEK ${current} / ${total}` };
}

export function WorkspaceOverview({ shell }: { shell: WorkspaceShell }) {
  const s = shell.shell;
  return (
    <div
      className="ws-shell ws"
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <WorkspaceTopBar
        view={shell.view}
        viewerInitials={shell.viewer.initials}
        crumbs={buildShellCrumbs(s, shell.view)}
        modeChip={buildShellModeChip(s)}
      />
      <div className="ws-body">
        <WorkspaceSidebar
          data={shell.sidebar}
          viewer={shell.viewer}
          activeWorkspaceId={shell.workspaceId}
        />
        <main className="ws-main">
          <WorkspaceMHead
            view={shell.view}
            basePath={shell.basePath}
            activeTab="overview"
            internFirstName={s.internFirstName}
            internLastName={s.internLastName}
            internshipTitle={s.internshipTitle}
            startDate={s.startDate}
            endDate={s.endDate}
            taskCount={s.taskCount}
            deliverableCount={s.deliverableCount}
          />
          <Suspense fallback={<WorkspaceBodySkeleton />}>
            <WorkspaceOverviewBody workspaceId={shell.workspaceId} view={shell.view} />
          </Suspense>
        </main>
      </div>
      {shell.view === 'intern' && <StuckPill />}
    </div>
  );
}
