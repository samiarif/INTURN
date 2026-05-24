import { loadWorkspacePage } from '@/modules/workspace/page-data';
import { WorkspaceCommentsPage } from '@/modules/workspace/components/workspace-comments-page';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const ctx = await loadWorkspacePage(workspaceId, 'intern');
  return (
    <WorkspaceCommentsPage
      data={ctx.data}
      view={ctx.view}
      basePath={ctx.basePath}
      currentUserId={ctx.session.user.id}
    />
  );
}
