import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getApplicationsByApplicant } from '@/modules/applications/queries';
import { orgMark } from '@/lib/avatar';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-[#EFF6FF] text-[#1D4ED8]',
  reviewed: 'bg-[var(--surface-muted)] text-[var(--ink-2)]',
  shortlisted: 'bg-[var(--brand-50)] text-[var(--brand-600)]',
  interview: 'bg-[#FFFBEB] text-[#92400E]',
  accepted: 'bg-[#ECFDF5] text-[#15803D]',
  rejected: 'bg-[#FEF2F2] text-[#B91C1C]',
};

const STATUS_KEYS = new Set(['new', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected']);

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const [rows, tApps, locale] = await Promise.all([
    getApplicationsByApplicant(user.id),
    getTranslations('applications'),
    getLocale(),
  ]);

  // The existing query doesn't return the organization. Fetch the small
  // set of org rows we need to render the mark + eyebrow without
  // changing the shared query signature.
  const orgIds = [...new Set(rows.map((r) => r.internship.organizationId))];
  const orgs =
    orgIds.length > 0
      ? await db.select().from(organizations).where(inArray(organizations.id, orgIds))
      : [];
  const orgsById = new Map(orgs.map((o) => [o.id, o]));

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto p-8">
      <nav className="flex items-center gap-4 text-sm mb-6 border-b border-[var(--border-color)]">
        <span className="px-3 py-2 border-b-2 border-[var(--brand-500)] text-[var(--ink)] font-medium">
          {tApps('tabActive')}
        </span>
        <Link
          href="/intern/saved"
          className="px-3 py-2 text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          {tApps('tabSaved')}
        </Link>
      </nav>

      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1.5">{tApps('title')}</h1>
          <p className="text-[13.5px] text-[var(--ink-3)]">
            {rows.length === 0 ? tApps('subtitleNone') : tApps('subtitleCount', { n: rows.length })}
          </p>
        </div>
        {rows.length > 0 && (
          <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--ink-3)]">
            {tApps('countLabel')} · {rows.length}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center bg-[var(--surface)]">
          <p className="text-[var(--ink-2)] font-medium mb-2">{tApps('emptyHeading')}</p>
          <p className="text-[var(--ink-3)] text-sm mb-4">{tApps('emptyBody')}</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {tApps('browseCta')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ application, internship }) => {
            const status = application.status ?? 'new';
            const org = orgsById.get(internship.organizationId);
            const { initials, tone } = orgMark(org?.name ?? '??', internship.organizationId);
            const statusLabel = STATUS_KEYS.has(status)
              ? tApps(
                  `status.${status as 'new' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected'}`,
                )
              : status;
            return (
              <Link
                key={application.id}
                href={`/intern/applications/${application.id}`}
                className="group flex items-center gap-4 border border-[var(--border-color)] bg-[var(--surface)] rounded-lg px-4 py-3.5 hover:border-[var(--border-strong)] hover:shadow-sm transition-all"
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md font-mono text-[12px] font-bold flex-shrink-0 border"
                  style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  {org?.name && (
                    <div className="font-mono text-[10.5px] text-[var(--ink-3)] uppercase tracking-[0.06em] mb-0.5 truncate">
                      {org.name}
                    </div>
                  )}
                  <div className="font-medium text-[14.5px] text-[var(--ink)] tracking-tight truncate">
                    {internship.title}
                  </div>
                  <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
                    {tApps('appliedOn', {
                      date: dateFmt.format(new Date(application.createdAt)),
                    })}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-mono font-semibold tracking-[0.06em] uppercase ${STATUS_STYLE[status] ?? STATUS_STYLE.new}`}
                >
                  {statusLabel}
                </span>
                <span
                  aria-hidden
                  className="text-[var(--ink-4)] group-hover:text-[var(--brand-500)] group-hover:translate-x-0.5 transition-all text-[18px] leading-none"
                >
                  {'›'}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
