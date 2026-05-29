import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { canViewProject } from '@/modules/team/authz';
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
  if (!(await canViewProject(user.id, role, project))) notFound();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, project.organizationId))
    .limit(1);

  // Build the supervisor's display name for the live-preview rail. Falls back
  // to email if name fields are empty (older onboarding rows).
  const supervisorName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'You';

  return (
    <div className="max-w-[1200px] mx-auto p-6 sm:p-8">
      <PostInternshipForm
        projectId={projectId}
        projectName={project.name}
        projectStartDate={project.startDate ?? null}
        orgName={org?.name ?? 'Your company'}
        orgLocation={org?.city ?? org?.location ?? ''}
        supervisorName={supervisorName}
      />
    </div>
  );
}
