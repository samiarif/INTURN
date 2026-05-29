import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { canViewProject } from '@/modules/team/authz';
import { getApplicationsByProject } from '@/modules/applications/queries';
import { InboxClient } from './_inbox-client';

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
  if (!(await canViewProject(user.id, role, project))) notFound();

  const rows = await getApplicationsByProject(projectId);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="text-eyebrow font-mono text-[var(--ink-3)] uppercase mb-1">
        {project.name}
      </div>
      <h1 className="text-display font-[family-name:var(--font-display)] mb-2">Applications</h1>
      <p className="text-body text-[var(--ink-3)] mb-8">
        {rows.length} {rows.length === 1 ? 'application' : 'applications'} across this project&apos;s internships.
      </p>
      <InboxClient rows={rows} projectId={projectId} />
    </div>
  );
}
