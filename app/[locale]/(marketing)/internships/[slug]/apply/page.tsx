import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getInternshipWithOrgById } from '@/modules/internships/queries';
import { getProfileWithUserByClerkId } from '@/modules/profiles/queries';
import { ApplyForm } from './form';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId: clerkId } = await auth();
  const { slug } = await params;

  if (!clerkId) {
    redirect(`/sign-up?role=intern&next=/internships/${slug}/apply`);
  }

  const ctx = await getProfileWithUserByClerkId(clerkId);
  if (!ctx) redirect('/sign-in');
  if (!ctx.profile || ctx.profile.profileStep !== 'complete') {
    redirect('/onboarding/intern/basics');
  }

  const data = await getInternshipWithOrgById(slug);
  if (!data) notFound();
  const { internship, organization } = data;
  if (internship.status !== 'published' || organization.verificationStatus !== 'verified') {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
        Applying to · {organization.name}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{internship.title}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">
        Your profile ({ctx.user.firstName} {ctx.user.lastName} ·{' '}
        {ctx.profile.university} · {ctx.profile.yearOfStudy}) will be shared with the company.
      </p>
      <ApplyForm
        internshipId={internship.id}
        customQuestions={internship.customQuestions ?? []}
      />
    </div>
  );
}
