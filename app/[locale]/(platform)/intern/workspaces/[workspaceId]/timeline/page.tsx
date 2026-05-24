import { loadWorkspacePage } from '@/modules/workspace/page-data';
import { WorkspaceTimelinePage } from '@/modules/workspace/components/workspace-timeline-page';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const ctx = await loadWorkspacePage(workspaceId, 'intern');
  return (
    <WorkspaceTimelinePage
      data={ctx.data}
      view={ctx.view}
      basePath={ctx.basePath}
    />
  );
}
