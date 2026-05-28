import { WorkspaceMHead } from './m-head';
import { CommentsThread } from './comments-thread';
import { getWorkspaceComments } from '@/modules/comments/queries';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceView } from '../types';

export async function WorkspaceCommentsPage({
  data,
  view,
  currentUserId,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  // basePath retained in callers for API symmetry; unused since the
  // workspace consolidated to a single route with ?tab= switching.
  basePath?: string;
  currentUserId: string;
}) {
  const comments = await getWorkspaceComments(data.workspace.id);
  return (
    <>
      <WorkspaceMHead
        view={view}
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
        style={{ gridTemplateColumns: '1fr', paddingTop: 20, paddingBottom: 40, maxWidth: 760, margin: '0 auto', width: '100%' }}
      >
        <CommentsThread
          workspaceId={data.workspace.id}
          comments={comments}
          currentUserId={currentUserId}
        />
      </div>
    </>
  );
}
