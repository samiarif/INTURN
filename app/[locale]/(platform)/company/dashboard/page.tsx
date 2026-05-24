import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { organizations, applications, workspaces } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectsByOrganization } from '@/modules/projects/queries';
import { getInternshipsByProjectIds } from '@/modules/internships/queries';
import { orgMark } from '@/lib/avatar';

const PROJECT_STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)]',
  active: 'bg-[#ECFDF5] text-[#15803D]',
  archived: 'bg-[var(--surface-muted)] text-[var(--ink-4)]',
};

const APP_WAITING_STATUSES = ['new', 'reviewed', 'shortlisted', 'interview'];

function greetingKey(hour: number): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

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

  const projects = await getProjectsByOrganization(org.id);
  const projectIds = projects.map((p) => p.id);
  const internshipsList = await getInternshipsByProjectIds(projectIds);
  const internshipIds = internshipsList.map((i) => i.id);
  const [applicationRows, activeWorkspaceRows, tDash, locale] = await Promise.all([
    internshipIds.length > 0
      ? db.select().from(applications).where(inArray(applications.internshipId, internshipIds))
      : [],
    db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.organizationId, org.id)),
    getTranslations('dash.company'),
    getLocale(),
  ]);

  const internshipsByProject = internshipsList.reduce<Record<string, number>>((acc, i) => {
    if (i.projectId) acc[i.projectId] = (acc[i.projectId] ?? 0) + 1;
    return acc;
  }, {});
  const applicationsByProject = applicationRows.reduce<Record<string, number>>((acc, a) => {
    const i = internshipsList.find((x) => x.id === a.internshipId);
    if (i?.projectId) acc[i.projectId] = (acc[i.projectId] ?? 0) + 1;
    return acc;
  }, {});

  const isVerified = org.verificationStatus === 'verified';
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const waitingApps = applicationRows.filter((a) => APP_WAITING_STATUSES.includes(a.status ?? 'new'))
    .length;
  const activeWorkspaceCount = activeWorkspaceRows.length;

  // Greeting band.
  const now = new Date();
  const greeting = tDash(greetingKey(now.getHours()));
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const eyebrow = tDash('eyebrowSolo', { date: dateFmt.format(now), org: org.name });
  const orgVisual = orgMark(org.name, org.id);

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
        <div className="flex items-center gap-3 mb-3">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-9 h-9 rounded-md font-mono text-[12px] font-bold border"
            style={{
              background: orgVisual.tone.bg,
              color: orgVisual.tone.fg,
              borderColor: orgVisual.tone.border,
            }}
          >
            {orgVisual.initials}
          </span>
          <div className="font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--ink-3)]">
            {eyebrow}
          </div>
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
          {isVerified ? tDash('subtitleVerified') : tDash('subtitlePending')}
        </p>
      </div>

      {/* Stat tiles ----------------------------------------------------- */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile
          label={tDash('statsProjects')}
          value={activeProjectsCount}
          suffix={tDash('statsRunning')}
          accentClass="bg-[#CCFBF1]"
        />
        <StatTile
          label={tDash('statsApps')}
          value={waitingApps}
          suffix={tDash('statsThisWeek')}
          accentClass="bg-[var(--brand-50)]"
        />
        <StatTile
          label={tDash('statsInterns')}
          value={activeWorkspaceCount}
          suffix={tDash('statsOnboard')}
          accentClass="bg-[#FEF3C7]"
        />
      </div>

      {/* Verification banner -------------------------------------------- */}
      {!isVerified && (
        <div className="flex items-start gap-3 border border-[#FDE68A] bg-[#FFFBEB] rounded-lg p-4 mb-8">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FEF3C7] text-[#92400E] text-[15px] flex-shrink-0"
          >
            {'!'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <b className="text-[#92400E] text-[13.5px]">{tDash('verifyHeading')}</b>
              <span className="font-mono text-[10px] tracking-[0.06em] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#FED7AA] text-[#9A3412]">
                {org.verificationStatus}
              </span>
            </div>
            <p className="text-[13px] text-[#78350F] leading-relaxed">{tDash('verifyBody')}</p>
          </div>
        </div>
      )}

      {/* Projects header ------------------------------------------------ */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{tDash('projectsTitle')}</h2>
        {isVerified ? (
          <Link
            href="/company/projects/new"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {tDash('newProject')}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title={tDash('newProjectHelp')}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--surface-muted)] text-[var(--ink-4)] cursor-not-allowed"
          >
            {tDash('newProject')}
          </button>
        )}
      </div>

      {/* Projects grid -------------------------------------------------- */}
      {projects.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-lg p-12 text-center bg-[var(--surface)]">
          <p className="text-[var(--ink-2)] font-medium mb-1">{tDash('projectsEmptyHeading')}</p>
          <p className="text-[var(--ink-3)] text-sm">
            {isVerified ? tDash('projectsEmptyVerified') : tDash('projectsEmptyPending')}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {projects.map((p) => {
            const projectMark = orgMark(p.name, p.id);
            const internshipCount = internshipsByProject[p.id] ?? 0;
            const appCount = applicationsByProject[p.id] ?? 0;
            return (
              <Link
                key={p.id}
                href={`/company/projects/${p.id}`}
                className="group flex flex-col gap-3 border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md font-mono text-[11px] font-bold flex-shrink-0 border"
                    style={{
                      background: projectMark.tone.bg,
                      color: projectMark.tone.fg,
                      borderColor: projectMark.tone.border,
                    }}
                  >
                    {projectMark.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[14.5px] tracking-tight text-[var(--ink)] line-clamp-2">
                      {p.name}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold tracking-[0.06em] uppercase ${PROJECT_STATUS_STYLE[p.status]}`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[var(--ink-3)] pt-2 border-t border-[var(--border-color)]">
                  <span>{tDash('projectInternships', { n: internshipCount })}</span>
                  <span aria-hidden>·</span>
                  <span>{tDash('projectApps', { n: appCount })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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
      <span aria-hidden className={`absolute top-3 right-3 w-7 h-7 rounded-md ${accentClass}`} />
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
