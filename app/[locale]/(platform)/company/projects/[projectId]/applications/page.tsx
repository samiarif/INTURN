import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectById } from '@/modules/projects/queries';
import { getApplicationsByProject } from '@/modules/applications/queries';
import { InboxClient } from './_inbox-client';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'company';

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();
  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound();

  const rows = await getApplicationsByProject(projectId);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
        {project.name}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Applications</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">
        {rows.length} {rows.length === 1 ? 'application' : 'applications'} across this project&apos;s internships.
      </p>
      <InboxClient rows={rows} projectId={projectId} />
    </div>
  );
}
