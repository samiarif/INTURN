import { WorkspaceTopBar, type Crumb } from './topbar';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceMHead } from './m-head';
import { BriefCard } from './brief-card';
import { StatTiles } from './stat-tiles';
import { TaskList } from './task-list';
import { DeliverablesMini } from './deliverables-mini';
import { ActivityFeed, type ActorLookup } from './activity-feed';
import { RailIntern } from './rail-intern';
import { RailSupervisor } from './rail-supervisor';
import { StuckPill } from './stuck-pill';
import { computeWeekOfTotal } from '../queries';
import type { WorkspaceOverviewData } from '../queries';
import type { SidebarData, WorkspaceView } from '../types';

function buildCrumbs(data: WorkspaceOverviewData, view: WorkspaceView): Crumb[] {
  const projectOrInternship = data.project?.name ?? data.internship?.title ?? '—';
  if (view === 'intern') {
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

function buildActorLookup(data: WorkspaceOverviewData): ActorLookup {
  const map: ActorLookup = new Map();
  if (data.intern) map.set(data.intern.id, data.intern);
  for (const s of data.supervisors) map.set(s.id, s);
  return map;
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
  view,
  sidebar,
  viewer,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  sidebar: SidebarData;
  viewer: { initials: string; name: string; subtitle: string };
}) {
  return (
    <div className="ws-shell ws" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <WorkspaceTopBar
        view={view}
        viewerInitials={viewer.initials}
        crumbs={buildCrumbs(data, view)}
        modeChip={buildModeChip(data)}
      />
      <div className="ws-body">
        <WorkspaceSidebar data={sidebar} viewer={viewer} />
        <main className="ws-main">
          <WorkspaceMHead data={data} view={view} />
          <div className="ws-content">
            <div className="ws-col-main">
              <BriefCard data={data} view={view} />
              <StatTiles data={data} view={view} />
              <TaskList tasks={data.tasks} view={view} />
              <DeliverablesMini deliverables={data.deliverables} />
              <ActivityFeed events={data.events} actors={buildActorLookup(data)} />
            </div>
            <div className="ws-col-side">
              {view === 'intern' ? <RailIntern /> : <RailSupervisor />}
            </div>
          </div>
        </main>
      </div>
      {view === 'intern' && <StuckPill />}
    </div>
  );
}
