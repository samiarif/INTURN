import { Suspense } from 'react';
import { WorkspaceMHead } from './m-head';
import { WorkspaceOverviewBody } from './workspace-overview-body';
import { WorkspaceBodySkeleton } from './workspace-body-skeleton';
import type { WorkspaceShell } from '../page-data';

export function WorkspaceOverview({ shell }: { shell: WorkspaceShell }) {
  const s = shell.shell;
  return (
    <>
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
    </>
  );
}
