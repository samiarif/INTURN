import { loadWorkspacePage } from '@/modules/workspace/page-data';
import { WorkspaceDeliverablesPage } from '@/modules/workspace/components/workspace-deliverables-page';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const { workspaceId } = await params;
  const { selected } = await searchParams;
  const ctx = await loadWorkspacePage(workspaceId, 'supervisor');
  return (
    <WorkspaceDeliverablesPage
      data={ctx.data}
      view={ctx.view}
      basePath={ctx.basePath}
      selectedId={selected}
    />
  );
}
