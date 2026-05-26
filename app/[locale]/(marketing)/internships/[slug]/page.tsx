import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getInternshipWithOrgById } from '@/modules/internships/queries';
import { getProfileWithUserByClerkId } from '@/modules/profiles/queries';
import { ReportButton } from '@/modules/reports/components/report-button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const row = await getInternshipWithOrgById(slug);
  if (!row) return { title: 'Not found' };
  return {
    title: `${row.internship.title} — ${row.organization.name}`,
    description:
      row.internship.description?.slice(0, 160) ??
      `Internship at ${row.organization.name}`,
    alternates: {
      canonical: locale === 'fr' ? `/internships/${slug}` : `/en/internships/${slug}`,
      languages: {
        fr: `/internships/${slug}`,
        en: `/en/internships/${slug}`,
      },
    },
    openGraph: {
      title: row.internship.title,
      description: row.internship.description?.slice(0, 160),
      type: 'website',
      locale: locale === 'fr' ? 'fr_TN' : 'en_US',
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getInternshipWithOrgById(slug);
  if (!data) notFound();

  const { internship, organization } = data;
  // Only show if published + org verified
  if (internship.status !== 'published' || organization.verificationStatus !== 'verified') {
    notFound();
  }

  // Apply CTA logic — derive what to link to based on auth state
  const { userId: clerkId } = await auth();
  let applyHref = `/sign-up?role=intern&next=/internships/${internship.id}/apply`;
  let applyLabel = 'Sign up to apply';
  if (clerkId) {
    const ctx = await getProfileWithUserByClerkId(clerkId);
    if (ctx?.profile?.profileStep === 'complete') {
      applyHref = `/internships/${internship.id}/apply`;
      applyLabel = 'Apply now →';
    } else {
      applyHref = `/onboarding/intern/basics`;
      applyLabel = 'Complete profile to apply';
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-2">
        {organization.name} · {organization.city ?? organization.country ?? ''}
      </div>
      <h1 className="text-3xl font-semibold tracking-tight mb-4">{internship.title}</h1>
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--ink-3)] mb-8">
        {internship.duration && <span>{internship.duration} weeks</span>}
        <span>·</span>
        <span className="capitalize">{internship.locationType}</span>
        {internship.location && (
          <>
            <span>·</span>
            <span>{internship.location}</span>
          </>
        )}
        {internship.isPaid && (
          <>
            <span>·</span>
            <span className="text-[#15803D] font-medium">
              Paid{internship.compensation ? ` · ${internship.compensation}` : ''}
            </span>
          </>
        )}
        <span>·</span>
        <span className="uppercase">{internship.language}</span>
      </div>

      <section className="prose prose-slate max-w-none mb-10 text-[15px] leading-relaxed text-[var(--ink-2)] whitespace-pre-line">
        {internship.description}
      </section>

      {internship.skills && internship.skills.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {internship.skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-[12.5px] font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {internship.customQuestions && internship.customQuestions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            Application questions
          </h2>
          <ul className="space-y-2 text-[14px] text-[var(--ink-2)]">
            {internship.customQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--ink-4)] font-mono text-[12px] mt-1">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  {q.question}
                  {q.required && <span className="text-[var(--danger)] ml-1">*</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {organization.description && (
        <section className="mb-10 pb-10 border-b border-[var(--border-color)]">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            About {organization.name}
          </h2>
          <p className="text-[14px] text-[var(--ink-2)] leading-relaxed">{organization.description}</p>
          {organization.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-[var(--brand-600)] hover:text-[var(--brand-700)] mt-2 inline-block"
            >
              {organization.website} ↗
            </a>
          )}
        </section>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={applyHref}
          className="inline-flex items-center justify-center h-11 px-6 rounded-md text-base font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
        >
          {applyLabel}
        </Link>
        <Link
          href="/marketplace"
          className="text-[14px] text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ← All internships
        </Link>
        {clerkId && (
          <>
            <span className="flex-1" />
            <ReportButton subjectType="internship" subjectId={internship.id} />
          </>
        )}
      </div>
    </div>
  );
}
