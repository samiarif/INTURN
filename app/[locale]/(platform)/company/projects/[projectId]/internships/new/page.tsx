import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectById } from '@/modules/projects/queries';
import { PostInternshipForm } from './form';

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

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Post an internship</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">
        Under <b>{project.name}</b>. Saves as draft — publish from the project page to make
        it visible on the marketplace.
      </p>
      <PostInternshipForm projectId={projectId} />
    </div>
  );
}
