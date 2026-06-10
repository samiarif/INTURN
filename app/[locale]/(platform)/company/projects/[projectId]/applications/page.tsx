import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { canViewProject } from '@/modules/team/authz';
import { getApplicationsByProject } from '@/modules/applications/queries';
import { PageHeader } from '@/components/ui/page-header';
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

  const t = await getTranslations('applications');

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:p-8">
      <PageHeader
        eyebrow={project.name}
        title={t('inboxHeading')}
        description={t('inboxCount', { count: rows.length })}
        className="mb-8"
      />
      <InboxClient rows={rows} projectId={projectId} />
    </div>
  );
}
