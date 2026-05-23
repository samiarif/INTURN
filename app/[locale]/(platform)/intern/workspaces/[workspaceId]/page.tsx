import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  getWorkspaceOverview,
  getInternSidebarData,
  getSupervisorSidebarData,
} from '@/modules/workspace/queries';
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
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'intern';

  const { workspaceId } = await params;
  const data = await getWorkspaceOverview(workspaceId);
  if (!data) notFound();

  const supervisorOrgs =
    role === 'company'
      ? await db.select().from(organizations).where(eq(organizations.ownerId, user.id))
      : [];

  if (
    !canViewWorkspace(data.workspace, {
      userId: user.id,
      role,
      supervisorOf: supervisorOrgs.map((o) => o.id),
    })
  ) {
    notFound();
  }

  // Intern route always shows intern sidebar (admin viewing this route is
  // "looking through the intern's eyes"); supervisor sidebar is on /company/...
  const sidebar = await getInternSidebarData(data.workspace.internId);

  return (
    <WorkspaceOverview
      data={data}
      view="intern"
      sidebar={sidebar}
      viewer={{
        initials: `${data.intern?.firstName?.[0] ?? ''}${data.intern?.lastName?.[0] ?? ''}`,
        name: `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'Intern',
        subtitle: `${data.internProfile?.university ?? ''} · ${data.internProfile?.yearOfStudy ?? ''}`.trim(),
      }}
    />
  );
}
