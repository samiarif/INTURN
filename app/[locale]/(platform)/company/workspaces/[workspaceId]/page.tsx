import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getWorkspaceOverview, getSupervisorSidebarData } from '@/modules/workspace/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { WorkspaceOverview } from '@/modules/workspace/components/workspace-overview';

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'company';

  const { workspaceId } = await params;
  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();

  if (!canViewWorkspace(data.workspace, data.project, { userId: user.id, role })) {
    notFound();
  }

  // For admins viewing the supervisor view, use the workspace's org owner.
  const supervisorOfOrg = role === 'admin' ? data.organization?.ownerId : user.id;
  const sidebar = await getSupervisorSidebarData(supervisorOfOrg ?? user.id);

  const supervisor = data.supervisors[0];
  return (
    <WorkspaceOverview
      data={data}
      view="supervisor"
      sidebar={sidebar}
      basePath={`/company/workspaces/${data.workspace.id}`}
      viewer={{
        initials: supervisor
          ? `${supervisor.firstName?.[0] ?? ''}${supervisor.lastName?.[0] ?? ''}`
          : 'AD',
        name: supervisor
          ? `${supervisor.firstName ?? ''} ${supervisor.lastName ?? ''}`.trim()
          : 'Admin',
        subtitle: data.organization?.name ?? '',
      }}
    />
  );
}
