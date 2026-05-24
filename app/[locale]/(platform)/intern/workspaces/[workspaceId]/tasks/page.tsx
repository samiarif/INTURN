import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getWorkspaceOverview, getInternSidebarData } from '@/modules/workspace/queries';
import { canViewWorkspace } from '@/modules/workspace/service';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { WorkspaceTasksPage } from '@/modules/workspace/components/workspace-tasks-page';

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
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

  const { workspaceId } = await params;
  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();

  if (!canViewWorkspace(data.workspace, data.project, { userId: user.id, role })) {
    notFound();
  }

  const sidebar = await getInternSidebarData(data.workspace.internId);

  return (
    <WorkspaceTasksPage
      data={data}
      view="intern"
      sidebar={sidebar}
      basePath={`/intern/workspaces/${data.workspace.id}`}
      viewer={{
        initials: `${data.intern?.firstName?.[0] ?? ''}${data.intern?.lastName?.[0] ?? ''}`,
        name: `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'Intern',
        subtitle: `${data.internProfile?.university ?? ''} · ${data.internProfile?.yearOfStudy ?? ''}`.trim(),
      }}
    />
  );
}
