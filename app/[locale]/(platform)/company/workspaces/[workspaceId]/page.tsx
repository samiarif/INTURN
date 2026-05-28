import { loadWorkspaceShell, loadWorkspacePage } from '@/modules/workspace/page-data';
import { WorkspaceRoute } from '@/modules/workspace/components/workspace-route';
import { WorkspaceOverview } from '@/modules/workspace/components/workspace-overview';
import { WorkspaceTasksPage } from '@/modules/workspace/components/workspace-tasks-page';
import { WorkspaceDeliverablesPage } from '@/modules/workspace/components/workspace-deliverables-page';
import { WorkspaceTimelinePage } from '@/modules/workspace/components/workspace-timeline-page';
import { WorkspaceCommentsPage } from '@/modules/workspace/components/workspace-comments-page';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ tab?: string; selected?: string }>;
}) {
  const { workspaceId } = await params;
  const { selected } = await searchParams;
  const [shell, ctx] = await Promise.all([
    loadWorkspaceShell(workspaceId, 'supervisor'),
    loadWorkspacePage(workspaceId, 'supervisor'),
  ]);
  return (
    <WorkspaceRoute
      tabs={{
        overview: <WorkspaceOverview shell={shell} />,
        tasks: <WorkspaceTasksPage data={ctx.data} view="supervisor" basePath={ctx.basePath} />,
        deliverables: (
          <WorkspaceDeliverablesPage
            data={ctx.data}
            view="supervisor"
            basePath={ctx.basePath}
            selectedId={selected}
          />
        ),
        timeline: <WorkspaceTimelinePage data={ctx.data} view="supervisor" basePath={ctx.basePath} />,
        comments: (
          <WorkspaceCommentsPage
            data={ctx.data}
            view="supervisor"
            basePath={ctx.basePath}
            currentUserId={ctx.session.user.id}
          />
        ),
      }}
    />
  );
}
