import { auth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { ProjectCreateForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, user.id))
    .limit(1);
  if (!org) redirect('/onboarding/company');

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8">
      {org.verificationStatus !== 'verified' && (
        <div className="border border-[#FDE68A] bg-[#FFFBEB] text-[#78350F] rounded-md p-3 text-[12.5px] mb-6">
          <b className="text-[#92400E] block mb-1">
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
