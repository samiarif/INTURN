import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { PostInternshipForm } from './form';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { user, role } = session;

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
