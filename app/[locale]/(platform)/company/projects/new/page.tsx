import { auth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getCurrentOrg } from '@/modules/team/authz';
import { ProjectCreateForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const current = await getCurrentOrg(user.id);
  if (!current) redirect('/onboarding/company');
  const org = current.org;

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8">
      {org.verificationStatus !== 'verified' && (
        <div className="border border-[color-mix(in_srgb,var(--status-warn-ink)_30%,transparent)] bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)] rounded-md p-3 text-caption mb-6">
          <b className="text-[var(--status-warn-ink)] font-semibold block mb-1">
            Your organization is awaiting verification
          </b>
          You can draft a project, but you won&apos;t be able to publish internships from it
          until an admin marks your organization as verified.
        </div>
      )}
      <ProjectCreateForm />
    </div>
  );
}
