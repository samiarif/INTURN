import { BriefCard } from './brief-card';
import { StatTiles } from './stat-tiles';
import { TaskList } from './task-list';
import { DeliverablesMini } from './deliverables-mini';
import { ActivityFeed, type ActorLookup } from './activity-feed';
import { RailIntern } from './rail-intern';
import { RailSupervisor } from './rail-supervisor';
import { loadWorkspaceData } from '../page-data';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';

function buildActorLookup(data: WorkspaceOverviewData): ActorLookup {
  const map: ActorLookup = new Map();
  if (data.intern) map.set(data.intern.id, data.intern);
  for (const s of data.supervisors) map.set(s.id, s);
  return map;
}

export async function WorkspaceOverviewBody({
  workspaceId,
  view,
}: {
  workspaceId: string;
  view: WorkspaceView;
}) {
  const data = await loadWorkspaceData(workspaceId);
  return (
    <div className="ws-content">
      <div className="ws-col-main">
        <BriefCard data={data} view={view} />
        <StatTiles data={data} view={view} />
        <TaskList tasks={data.tasks} view={view} />
        <DeliverablesMini deliverables={data.deliverables} />
        <ActivityFeed events={data.events} actors={buildActorLookup(data)} />
      </div>
      <div className="ws-col-side">
        {view === 'intern' ? <RailIntern data={data} /> : <RailSupervisor data={data} />}
      </div>
    </div>
  );
}
