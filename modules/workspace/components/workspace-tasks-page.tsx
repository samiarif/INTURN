import { WorkspaceMHead } from './m-head';
import { TasksBoard } from './tasks-board';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';

export function WorkspaceTasksPage({
  data,
  view,
  basePath,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  basePath: string;
}) {
  const internName =
    `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'the intern';
  return (
    <>
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
    </>
  );
}
