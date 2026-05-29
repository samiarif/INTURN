import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { canViewProject } from '@/modules/team/authz';
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
  // Same guard as the project hub: platform admin, assigned supervisor, or org owner/admin.
  if (!(await canViewProject(user.id, role, project))) notFound();

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8">
      <ProjectCreateForm initialProject={project} />
    </div>
  );
}
