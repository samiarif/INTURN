import { loadWorkspaceShell } from '@/modules/workspace/page-data';
import { WorkspaceShellLayout } from '@/modules/workspace/components/workspace-shell-layout';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const shell = await loadWorkspaceShell(workspaceId, 'intern');
  return <WorkspaceShellLayout shell={shell}>{children}</WorkspaceShellLayout>;
}
