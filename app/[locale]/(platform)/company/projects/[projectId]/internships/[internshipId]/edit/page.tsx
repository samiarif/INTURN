import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { getInternshipById } from '@/modules/internships/queries';
import { PostInternshipForm } from '../../new/form';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; internshipId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { user, role } = session;

  const { projectId, internshipId } = await params;
  const internship = await getInternshipById(internshipId);
  // Guard the internship exists and actually sits under the routed project.
  if (!internship || internship.projectId !== projectId) notFound();

  const project = await getProjectById(projectId);
  if (!project) notFound();
  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, project.organizationId))
    .limit(1);

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
        initialInternship={internship}
      />
    </div>
  );
}
