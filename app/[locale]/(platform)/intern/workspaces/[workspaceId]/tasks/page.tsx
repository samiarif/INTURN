import { loadWorkspacePage } from '@/modules/workspace/page-data';
import { WorkspaceTasksPage } from '@/modules/workspace/components/workspace-tasks-page';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const ctx = await loadWorkspacePage(workspaceId, 'intern');
  return (
    <WorkspaceTasksPage
      data={ctx.data}
      view={ctx.view}
      basePath={ctx.basePath}
    />
  );
}
