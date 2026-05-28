import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getProfileByUserId } from '@/modules/profiles/queries';
import { getInternSidebarData } from '@/modules/workspace/queries';
import { getApplicationsByApplicant, getOrganizationsByIds } from '@/modules/applications/queries';
import { listPublishedInternships } from '@/modules/internships/queries';
import { listInternBookmarks } from '@/modules/bookmarks/queries';
import { InternshipCard, type InternshipCardStrings } from '@/components/marketplace/internship-card';
import { orgMark } from '@/lib/avatar';
import { ProfileCompletenessWidget } from '@/components/profile-completeness-widget';
import { computeProfileCompleteness } from '@/modules/profiles/service';
import { FteChecklist } from '@/components/fte-checklist';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-[#EFF6FF] text-[#1D4ED8]',
  reviewed: 'bg-[var(--surface-muted)] text-[var(--ink-2)]',
  shortlisted: 'bg-[var(--brand-50)] text-[var(--brand-600)]',
  interview: 'bg-[#FFFBEB] text-[#92400E]',
  accepted: 'bg-[#ECFDF5] text-[#15803D]',
  rejected: 'bg-[#FEF2F2] text-[#B91C1C]',
};

const STATUS_KEYS = new Set(['new', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected']);

function greetingKey(hour: number): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { user, role } = session;
  const isAdmin = role === 'admin';

  const earlyProfile = await getProfileByUserId(user.id);
  if (!isAdmin && (!earlyProfile || earlyProfile.profileStep !== 'complete')) {
    redirect('/onboarding/intern/basics');
  }

  const [profile, sidebarData, applicationRows, recommendedAll, bookmarkRows, tApps, tDash, locale, tMarketplace, tCard] =
    await Promise.all([
      Promise.resolve(earlyProfile),
      getInternSidebarData(user.id),
      getApplicationsByApplicant(user.id),
      listPublishedInternships({ limit: 12 }),
      listInternBookmarks(user.id),
      getTranslations('applications'),
      getTranslations('dash.intern'),
      getLocale(),
      getTranslations('marketplace'),
      getTranslations('card'),
    ]);

  const cardStrings: InternshipCardStrings = {
    saveLabel: '',
    removeLabel: '',
    matchPill: (n: number) => tMarketplace('matchPill', { n }),
    paidPaid: tMarketplace('paid.paid'),
    paidUnpaid: tMarketplace('paid.unpaid'),
    durationWeeks: (n: number) => tCard('durationWeeks', { n }),
    deadlineToday: tCard('deadlineToday'),
    deadlineInDays: (n: number) => tCard('deadlineInDays', { n }),
    closed: tCard('closed'),
    rolling: tCard('rolling'),
  };

  const workspaces = sidebarData.role === 'intern' ? sidebarData.activeWorkspaces : [];
  const recentApplications = applicationRows.slice(0, 5);

  // Recommend top 3 by role match (in-memory filter). If no profile.roles,
  // fall back to first 3.
  const profileRoles = new Set((profile?.roles ?? []).map((r) => r.toLowerCase()));
  const recommended =
    profileRoles.size > 0
      ? recommendedAll
          .filter((r) =>
            (r.internship.sector ?? '')
              .toLowerCase()
              .split(/\s+/)
              .some((w) => profileRoles.has(w)),
          )
          .slice(0, 3)
      : recommendedAll.slice(0, 3);

  // Org lookup for the applications list.
  const recentOrgIds = [...new Set(recentApplications.map((r) => r.internship.organizationId))];
  const orgs = await getOrganizationsByIds(recentOrgIds);
  const orgsById = new Map(orgs.map((o) => [o.id, o]));

  // Greeting + eyebrow line based on viewer's locale clock.
  const now = new Date();
  const greeting = tDash(greetingKey(now.getHours()));
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const dateLabel = dateFmt.format(now);
  const eyebrow = profile?.city
    ? tDash('eyebrowWithCity', { date: dateLabel, city: profile.city })
    : tDash('eyebrowSolo', { date: dateLabel });

  const completeness = profile
    ? computeProfileCompleteness({
        firstName: user.firstName,
        lastName: user.lastName,
        university: profile.university,
        yearOfStudy: profile.yearOfStudy,
        fieldOfStudy: profile.fieldOfStudy,
        city: profile.city,
        skills: profile.skills,
        roles: profile.roles,
        resumeUrl: profile.resumeUrl,
        portfolioLinks: profile.portfolioLinks,
      })
    : null;

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Welcome band ---------------------------------------------------- */}
      <div
        className="relative overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-8 py-7 mb-6"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--brand-500) 8%, transparent), transparent 50%), radial-gradient(circle at 88% 30%, color-mix(in srgb, var(--accent-500) 10%, transparent), transparent 50%)',
        }}
      >
        <div className="font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--ink-3)] mb-2">
          {eyebrow}
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--ink)] mb-1">
          {greeting},{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 60%)',
            }}
          >
            {user.firstName ?? 'there'}
          </span>
        </h1>
        <p className="text-[14px] text-[var(--ink-2)] max-w-[58ch] leading-relaxed">
          {tDash('subtitle')}
        </p>
      </div>

      {/* First-time experience — hides once all 3 done OR dismissed.
          Items computed server-side; component handles localStorage + confetti. */}
      <FteChecklist
        role="intern"
        userId={user.id}
        items={[
          {
            key: 'completeProfile',
            done: (completeness?.percent ?? 0) >= 80,
            href: '/account/edit',
          },
          {
            key: 'bookmark',
            done: bookmarkRows.length >= 3,
            href: '/marketplace',
          },
          {
            key: 'firstApply',
            done: applicationRows.length > 0,
            href: '/marketplace',
          },
        ]}
      />

      {/* Profile completeness — hides at 100% */}
      {completeness && <ProfileCompletenessWidget completeness={completeness} />}

      {/* Stat tiles ----------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <StatTile
          label={tDash('statsApplications')}
          value={applicationRows.length}
          suffix={tDash('statsActive')}
          accentClass="bg-[var(--brand-50)]"
        />
        <StatTile
          label={tDash('statsBookmarks')}
          value={bookmarkRows.length}
          suffix={tDash('statsItems')}
          accentClass="bg-[#FCE7F3]"
        />
        <StatTile
          label={tDash('statsWorkspaces')}
          value={workspaces.length}
          suffix={tDash('statsActive')}
          accentClass="bg-[#CCFBF1]"
        />
      </div>

      {/* Workspaces ----------------------------------------------------- */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold tracking-tight">{tDash('workspacesTitle')}</h2>
        </div>
        {workspaces.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-lg p-8 text-center bg-[var(--surface)]">
            <p className="text-[var(--ink-3)] text-sm mb-4">{tDash('workspacesEmpty')}</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
            >
              {tDash('browseCta')}
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {workspaces.map((w) => (
              <Link
                key={w.id}
                href={`/intern/workspaces/${w.id}`}
                className="group block border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-[14px] text-[var(--ink)] tracking-tight">
                    {w.label}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] uppercase font-semibold px-2 py-0.5 rounded-full ${
                      w.live
                        ? 'bg-[#ECFDF5] text-[var(--success)]'
                        : 'bg-[var(--surface-muted)] text-[var(--ink-3)]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: w.live ? 'var(--success)' : 'var(--ink-4)' }}
                    />
                    {w.live ? tDash('workspacesActive') : tDash('workspacesDone')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent applications -------------------------------------------- */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold tracking-tight">
            {tDash('recentApplicationsTitle')}
          </h2>
          {applicationRows.length > 0 && (
            <Link
              href="/intern/applications"
              className="text-[12.5px] text-[var(--brand-600)] hover:text-[var(--brand-700)]"
            >
              {tDash('seeAll', { n: applicationRows.length })}
            </Link>
          )}
        </div>
        {recentApplications.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-lg p-8 text-center bg-[var(--surface)]">
            <p className="text-[var(--ink-3)] text-sm mb-4">{tDash('applicationsEmpty')}</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
            >
              {tDash('browseCta')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentApplications.map(({ application, internship }) => {
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
                  className="group flex items-center gap-3 border border-[var(--border-color)] bg-[var(--surface)] rounded-lg px-4 py-3 hover:border-[var(--border-strong)] hover:shadow-sm transition-all"
                >
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md font-mono text-[11px] font-bold flex-shrink-0 border"
                    style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[14px] truncate">{internship.title}</div>
                    {org?.name && (
                      <div className="text-[12px] text-[var(--ink-3)] mt-0.5 truncate">
                        {org.name}
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-mono font-semibold tracking-[0.06em] uppercase ${STATUS_STYLE[status] ?? STATUS_STYLE.new}`}
                  >
                    {statusLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recommended ---------------------------------------------------- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold tracking-tight">{tDash('recommendedTitle')}</h2>
          <Link
            href="/marketplace"
            className="text-[12.5px] text-[var(--brand-600)] hover:text-[var(--brand-700)]"
          >
            {tDash('browseAll')}
          </Link>
        </div>
        {recommended.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-lg p-8 text-center text-[var(--ink-3)] text-sm bg-[var(--surface)]">
            {tDash('recommendedEmpty')}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {recommended.map(({ internship, organization }) => (
              <InternshipCard
                key={internship.id}
                internship={internship}
                organization={organization}
                strings={cardStrings}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  suffix,
  accentClass,
}: {
  label: string;
  value: number;
  suffix?: string;
  accentClass: string;
}) {
  return (
    <div className="relative border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-4 overflow-hidden">
      <span
        aria-hidden
        className={`absolute top-3 right-3 w-7 h-7 rounded-md ${accentClass}`}
      />
      <div className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-[var(--ink-3)] mb-1">
        {label}
      </div>
      <div className="text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-none">
        {value}
        {suffix && (
          <span className="font-normal text-[12.5px] text-[var(--ink-3)] ml-1.5 tracking-normal">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
