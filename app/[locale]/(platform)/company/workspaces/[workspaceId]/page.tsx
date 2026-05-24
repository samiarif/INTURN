import { loadWorkspacePage } from '@/modules/workspace/page-data';
import { WorkspaceOverview } from '@/modules/workspace/components/workspace-overview';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const ctx = await loadWorkspacePage(workspaceId, 'supervisor');
  return (
    <WorkspaceOverview
      data={ctx.data}
      view={ctx.view}
      sidebar={ctx.sidebar}
      basePath={ctx.basePath}
      viewer={ctx.viewer}
    />
  );
}
