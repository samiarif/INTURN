import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { WorkspaceTopBar, type Crumb } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { StuckPill } from './stuck-pill';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceShell } from '../page-data';

function buildShellCrumbs(
  shell: WorkspaceShell['shell'],
  view: WorkspaceShell['view'],
  myWorkspacesLabel: string,
): Crumb[] {
  // Workspace-level crumbs only — per-tab label is shown in the MHead tab bar.
  // The tab-bar visual highlight is the per-tab indicator.
  if (view === 'intern') {
    return [
      { label: myWorkspacesLabel },
      { label: `${shell.organizationName} · ${shell.projectOrInternshipLabel}`, bold: true },
    ];
  }
  return [
    { label: shell.organizationName },
    { label: shell.projectOrInternshipLabel },
    { label: shell.internFirstName ?? '—', bold: true },
  ];
}

function buildShellModeChip(shell: WorkspaceShell['shell']): { label: string } {
  const { current, total } = computeWeekOfTotal(shell.startDate, shell.durationWeeks);
  return { label: `${shell.locationType} · WEEK ${current} / ${total}` };
}

export async function WorkspaceShellLayout({
  shell,
  children,
}: {
  shell: WorkspaceShell;
  children: ReactNode;
}) {
  const s = shell.shell;
  const tCrumbs = await getTranslations('workspace.crumbs');
  return (
    <div
      className="ws-shell ws"
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <WorkspaceTopBar
        view={shell.view}
        viewerInitials={shell.viewer.initials}
        crumbs={buildShellCrumbs(s, shell.view, tCrumbs('myWorkspaces'))}
        modeChip={buildShellModeChip(s)}
      />
      <div className="ws-body">
        <WorkspaceSidebar
          data={shell.sidebar}
          viewer={shell.viewer}
          activeWorkspaceId={shell.workspaceId}
        />
        <main id="main-content" className="ws-main">{children}</main>
      </div>
      {shell.view === 'intern' && <StuckPill />}
    </div>
  );
}
