import { WorkspaceTopBar, type Crumb } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceMHead } from './m-head';
import { BriefCard } from './brief-card';
import { StatTiles } from './stat-tiles';
import { TaskList } from './task-list';
import { DeliverablesMini } from './deliverables-mini';
import { ActivityFeed } from './activity-feed';
import { RailIntern } from './rail-intern';
import { RailSupervisor } from './rail-supervisor';
import { StuckPill } from './stuck-pill';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceOverviewData } from '../queries';
import type { SidebarData, WorkspaceViewerRole } from '../types';

function buildCrumbs(data: WorkspaceOverviewData, role: WorkspaceViewerRole): Crumb[] {
  const projectOrInternship = data.project?.name ?? data.internship?.title ?? '—';
  if (role === 'intern') {
    return [
      { label: 'My workspaces' },
      { label: `${data.organization?.name ?? '—'} · ${projectOrInternship}` },
      { label: 'Overview', bold: true },
    ];
  }
  return [
    { label: data.organization?.name ?? '—' },
    { label: projectOrInternship },
    { label: data.intern?.firstName ?? '—' },
    { label: 'Overview', bold: true },
  ];
}

function buildModeChip(data: WorkspaceOverviewData): { label: string } {
  const start = data.workspace.startDate ? new Date(data.workspace.startDate) : null;
  const durationWeeks = data.internship?.duration ?? 12;
  const { current, total } = computeWeekOfTotal(start, durationWeeks);
  const locationType = (data.internship?.locationType ?? 'hybrid').toUpperCase();
  return { label: `${locationType} · WEEK ${current} / ${total}` };
}

export function WorkspaceOverview({
  data,
  role,
  sidebar,
  viewer,
}: {
  data: WorkspaceOverviewData;
  role: WorkspaceViewerRole;
  sidebar: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
}) {
  return (
    <div className="ws-shell ws" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <WorkspaceTopBar
        role={role}
        viewerInitials={viewer.initials}
        crumbs={buildCrumbs(data, role)}
        modeChip={buildModeChip(data)}
      />
      <div className="ws-body">
        <WorkspaceSidebar data={sidebar} viewer={viewer} />
        <main className="ws-main">
          <WorkspaceMHead data={data} role={role} />
          <div className="ws-content">
            <div className="ws-col-main">
              <BriefCard data={data} role={role} />
              <StatTiles data={data} role={role} />
              <TaskList tasks={data.tasks} role={role} />
              <DeliverablesMini deliverables={data.deliverables} />
              <ActivityFeed events={data.events} />
            </div>
            <div className="ws-col-side">
              {role === 'intern' ? <RailIntern /> : <RailSupervisor />}
            </div>
          </div>
        </main>
      </div>
      {role === 'intern' && <StuckPill />}
    </div>
  );
}
