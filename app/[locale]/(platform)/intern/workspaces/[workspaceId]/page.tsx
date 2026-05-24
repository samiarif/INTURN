import { loadWorkspaceShell } from '@/modules/workspace/page-data';
import { WorkspaceOverview } from '@/modules/workspace/components/workspace-overview';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const shell = await loadWorkspaceShell(workspaceId, 'intern');
  return <WorkspaceOverview shell={shell} />;
}
