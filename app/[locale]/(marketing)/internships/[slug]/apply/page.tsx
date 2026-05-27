import { auth } from '@/lib/server-auth';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getInternshipWithOrgById } from '@/modules/internships/queries';
import { getProfileWithUserByClerkId } from '@/modules/profiles/queries';
import { ApplyForm } from './form';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { userId: clerkId } = await auth();
  const { slug, locale } = await params;

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

  const t = await getTranslations({ locale, namespace: 'applications.apply' });
  const fullName =
    `${ctx.user.firstName ?? ''} ${ctx.user.lastName ?? ''}`.trim() || ctx.user.email;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
        {t('eyebrow', { org: organization.name })}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{internship.title}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">
        {t('intro', {
          name: fullName,
          university: ctx.profile.university ?? '—',
          year: ctx.profile.yearOfStudy ?? '—',
        })}
      </p>
      <ApplyForm
        internshipId={internship.id}
        customQuestions={internship.customQuestions ?? []}
      />
    </div>
  );
}
