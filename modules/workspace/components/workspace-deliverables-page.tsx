import { WorkspaceMHead } from './m-head';
import { DeliverablesList } from './deliverables-list';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';

export function WorkspaceDeliverablesPage({
  data,
  view,
  basePath,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  basePath: string;
}) {
  return (
    <>
      <WorkspaceMHead
        view={view}
        basePath={basePath}
        activeTab="deliverables"
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
        <DeliverablesList deliverables={data.deliverables} view={view} />
      </div>
    </>
  );
}
