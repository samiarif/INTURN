import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { ProjectCreateForm } from '../../new/form';

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
  // Same guard as the project hub: supervisors of the project (or admins).
  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound();

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8">
      <ProjectCreateForm initialProject={project} />
    </div>
  );
}
