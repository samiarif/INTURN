// Company Dashboard (§01 Workspace Canvas) — supervisor's home.
// Lands here on login. Cross-project rollup: welcome band + 4 KPI tiles +
// recent projects mini-grid + today's tasks. Right rail carries the mini
// calendar + upcoming syncs.
//
// Design ref: docs/design-bundle/project/mocks/workspace-dashboard.{jsx,css}
// (PDF p.03). All `.db-*` class definitions live at the bottom of
// app/globals.css — token names rebound for our globals (--border-color,
// --brand-500, --accent-500…). Server component, no client state.
import Link from 'next/link';
import { auth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { and, eq, gte, inArray, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  organizations,
  applications,
  workspaces,
  tasks,
  deliverables,
  events,
  users,
} from '@/db/schema';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectsByOrganization } from '@/modules/projects/queries';
import { getInternshipsByProjectIds } from '@/modules/internships/queries';
import { CalendarWidget } from '@/components/dashboard/calendar-widget';
import { FteChecklist } from '@/components/fte-checklist';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_HOUR = 1000 * 60 * 60;

function greetingKey(hour: number): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

/** Two-letter mark from the first two words. "Brand audit" → "BA". */
function projectCode(name: string): string {
  const parts = name.split(/[\s·—\-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return ((a + b) || name.slice(0, 2)).toUpperCase();
}

/** Deterministic brand-ish tint for a project mark. */
const PROJECT_TINTS = ['#8F1FFE', '#2563EB', '#06B6D4', '#E467FE', '#EA580C', '#16A34A'] as const;
function tintFor(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return PROJECT_TINTS[(h >>> 0) % PROJECT_TINTS.length];
}

function initialsOf(first?: string | null, last?: string | null, email?: string | null): string {
  const a = (first ?? '').trim()[0] ?? '';
  const b = (last ?? '').trim()[0] ?? '';
  if (a || b) return (a + b).toUpperCase();
  return (email ?? '?').slice(0, 2).toUpperCase();
}

/** "2h" / "3d" / "5m" — coarse age stamp for the review tile. */
function shortAge(from: Date, now: Date): string {
  const ms = now.getTime() - from.getTime();
  if (ms < 60_000) return '<1m';
  if (ms < MS_PER_HOUR) return `${Math.floor(ms / 60_000)}m`;
  if (ms < MS_PER_DAY) return `${Math.floor(ms / MS_PER_HOUR)}h`;
  return `${Math.floor(ms / MS_PER_DAY)}d`;
}

const TASK_STATUS_CLASS: Record<string, 'review' | 'progress' | 'todo' | 'done'> = {
  review: 'review',
  'in-progress': 'progress',
  todo: 'todo',
  done: 'done',
};

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

  // ------ First pass: project + internship rollup (fk-only). ------
  const projects = await getProjectsByOrganization(org.id);
  const projectIds = projects.map((p) => p.id);
  const internshipsList = await getInternshipsByProjectIds(projectIds);
  const internshipIds = internshipsList.map((i) => i.id);

  // ------ Reference points: now / week-ago boundary. ------
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
  const twoWeeksAhead = new Date(now.getTime() + 14 * MS_PER_DAY);

  // ------ Org's workspaces — every downstream query (tasks, deliverables,
  // calendar events, supervisors) keys off these. ------
  const orgWorkspaces = await db
    .select({ id: workspaces.id, internId: workspaces.internId, status: workspaces.status })
    .from(workspaces)
    .where(eq(workspaces.organizationId, org.id));
  const workspaceIds = orgWorkspaces.map((w) => w.id);
  const activeWorkspaceCount = orgWorkspaces.filter((w) => w.status === 'active').length;

  // ------ Big parallel batch: counts + lists + i18n. ------
  const [
    applicationRows,
    appsLastWeekRows,
    waitingDeliverables,
    taskRows,
    syncEventRows,
    monthEventRows,
    supervisorRows,
    tDash,
    locale,
  ] = await Promise.all([
    // All applications (for total count + per-project rollup).
    internshipIds.length > 0
      ? db
          .select({
            id: applications.id,
            internshipId: applications.internshipId,
            status: applications.status,
            createdAt: applications.createdAt,
          })
          .from(applications)
          .where(inArray(applications.internshipId, internshipIds))
      : Promise.resolve([] as Array<{
          id: string;
          internshipId: string;
          status: string | null;
          createdAt: Date;
        }>),
    // Apps created in last 7d, for the KPI tile delta.
    internshipIds.length > 0
      ? db
          .select({ id: applications.id, createdAt: applications.createdAt })
          .from(applications)
          .where(
            and(
              inArray(applications.internshipId, internshipIds),
              gte(applications.createdAt, weekAgo),
            ),
          )
      : Promise.resolve([] as Array<{ id: string; createdAt: Date }>),
    // Deliverables in 'submitted' status — these are what the supervisor
    // needs to review. Submitted_at falls back to created_at for the
    // "oldest 2h" timer.
    workspaceIds.length > 0
      ? db
          .select({
            id: deliverables.id,
            submittedAt: deliverables.submittedAt,
            createdAt: deliverables.createdAt,
            workspaceId: deliverables.workspaceId,
          })
          .from(deliverables)
          .where(
            and(
              inArray(deliverables.workspaceId, workspaceIds),
              eq(deliverables.status, 'submitted'),
            ),
          )
      : Promise.resolve([] as Array<{
          id: string;
          submittedAt: Date | null;
          createdAt: Date;
          workspaceId: string;
        }>),
    // Open tasks across all org workspaces (cap at 6 for the list).
    workspaceIds.length > 0
      ? db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            workspaceId: tasks.workspaceId,
            updatedAt: tasks.updatedAt,
          })
          .from(tasks)
          .where(inArray(tasks.workspaceId, workspaceIds))
          .orderBy(desc(tasks.updatedAt))
          .limit(6)
      : Promise.resolve([] as Array<{
          id: string;
          title: string;
          status: string | null;
          workspaceId: string;
          updatedAt: Date;
        }>),
    // Upcoming syncs — system.checkin.scheduled within next 14d, target any
    // workspace in the org. Sort + filter by metadata.scheduledAt in JS
    // since it's nested in JSONB.
    workspaceIds.length > 0
      ? db
          .select()
          .from(events)
          .where(
            and(
              eq(events.type, 'system.checkin.scheduled'),
              inArray(events.targetId, workspaceIds),
              gte(events.createdAt, weekAgo),
            ),
          )
          .orderBy(desc(events.createdAt))
          .limit(20)
      : Promise.resolve([] as Array<typeof events.$inferSelect>),
    // Events in the current month (any type) targeting workspaces or
    // tasks/deliverables under them — for the calendar dots. We only need
    // the createdAt; we already pulled checkins above.
    workspaceIds.length > 0
      ? db
          .select({ createdAt: events.createdAt, type: events.type })
          .from(events)
          .where(
            and(
              inArray(events.targetId, workspaceIds),
              gte(events.createdAt, new Date(now.getFullYear(), now.getMonth(), 1)),
            ),
          )
      : Promise.resolve([] as Array<{ createdAt: Date; type: string }>),
    // Distinct supervisors = project.supervisorIds ∪ org.owner. Cheap:
    // we already have projects locally, and the owner is `user.id`.
    (async () => {
      const ids = new Set<string>([org.ownerId]);
      for (const p of projects) {
        for (const s of p.supervisorIds ?? []) ids.add(s);
      }
      const list = [...ids];
      if (list.length === 0) return [] as Array<{ id: string; firstName: string | null; lastName: string | null; email: string }>;
      return db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, list));
    })(),
    getTranslations('dash.company'),
    getLocale(),
  ]);

  // ------ Per-project task rollups, used to compute "progress %" for the
  // recent-projects mini cards. Done / total. ------
  const tasksByWorkspaceCount: Record<string, { done: number; total: number }> = {};
  if (workspaceIds.length > 0) {
    const allTasksForWorkspaces = await db
      .select({ status: tasks.status, workspaceId: tasks.workspaceId })
      .from(tasks)
      .where(inArray(tasks.workspaceId, workspaceIds));
    for (const t of allTasksForWorkspaces) {
      const bucket = (tasksByWorkspaceCount[t.workspaceId] ??= { done: 0, total: 0 });
      bucket.total++;
      if (t.status === 'done') bucket.done++;
    }
  }

  // ------ Internship-id → project-id lookup, used to roll workspaces up. ------
  const internshipToProject = new Map<string, string>();
  for (const i of internshipsList) {
    if (i.projectId) internshipToProject.set(i.id, i.projectId);
  }
  const workspaceToProject = new Map<string, string>();
  // Pull internshipId for each workspace so we can roll task counts up
  // by project.
  const wsLinks = workspaceIds.length > 0
    ? await db
        .select({ id: workspaces.id, internshipId: workspaces.internshipId })
        .from(workspaces)
        .where(inArray(workspaces.id, workspaceIds))
    : [];
  for (const link of wsLinks) {
    const pid = internshipToProject.get(link.internshipId);
    if (pid) workspaceToProject.set(link.id, pid);
  }
  const tasksByProject: Record<string, { done: number; total: number }> = {};
  for (const [wsId, bucket] of Object.entries(tasksByWorkspaceCount)) {
    const pid = workspaceToProject.get(wsId);
    if (!pid) continue;
    const agg = (tasksByProject[pid] ??= { done: 0, total: 0 });
    agg.done += bucket.done;
    agg.total += bucket.total;
  }

  // ------ KPI numbers. ------
  const isVerified = org.verificationStatus === 'verified';
  const activeProjects = projects.filter((p) => p.status === 'active');
  const activeProjectsCount = activeProjects.length;
  const projectsCreatedLastWeek = projects.filter(
    (p) => p.createdAt && new Date(p.createdAt).getTime() >= weekAgo.getTime(),
  ).length;
  const waitingReviewCount = waitingDeliverables.length;
  const newApplicationsCount = appsLastWeekRows.length;
  // Crude "delta vs last week" — we can't backfill historical week-over-
  // week counts without a snapshot table, so we compare apps in last 7d
  // to apps from 7-14d ago using the full application set we already have.
  const twoWeeksAgo = new Date(now.getTime() - 14 * MS_PER_DAY);
  const appsPrevWeekCount = applicationRows.filter((a) => {
    const c = new Date(a.createdAt);
    return c.getTime() >= twoWeeksAgo.getTime() && c.getTime() < weekAgo.getTime();
  }).length;
  const appsDelta = Math.max(0, newApplicationsCount - appsPrevWeekCount);
  const internCount = activeWorkspaceCount;
  const supervisorCount = supervisorRows.length;

  const oldestReview = waitingDeliverables
    .map((d) => d.submittedAt ?? d.createdAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  // ------ Greeting band. ------
  const greeting = tDash(greetingKey(now.getHours()));
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const eyebrow = tDash('eyebrowSolo', { date: dateFmt.format(now), org: org.name });

  // ------ Upcoming syncs (filtered + sorted in JS by metadata.scheduledAt). ------
  type SyncRow = {
    id: string;
    scheduledAt: Date;
    durationMinutes: number;
    meetingUrl?: string;
    note?: string;
    workspaceId: string;
  };
  const upcomingSyncs: SyncRow[] = syncEventRows
    .reduce<SyncRow[]>((acc, e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const scheduledRaw = meta.scheduledAt;
      if (!scheduledRaw || typeof scheduledRaw !== 'string') return acc;
      const scheduledAt = new Date(scheduledRaw);
      if (Number.isNaN(scheduledAt.getTime())) return acc;
      if (scheduledAt.getTime() < now.getTime() - 30 * 60_000) return acc;
      if (scheduledAt.getTime() > twoWeeksAhead.getTime()) return acc;
      acc.push({
        id: e.id,
        scheduledAt,
        durationMinutes:
          typeof meta.durationMinutes === 'number' ? meta.durationMinutes : 30,
        meetingUrl: typeof meta.meetingUrl === 'string' ? meta.meetingUrl : undefined,
        note: typeof meta.note === 'string' ? meta.note : undefined,
        workspaceId: e.targetId ?? '',
      });
      return acc;
    }, [])
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 4);

  // ------ Calendar dots (days of the current month with any activity). ------
  const eventDays = Array.from(
    new Set(
      monthEventRows
        .map((e) => new Date(e.createdAt))
        .filter((d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
        .map((d) => d.getDate()),
    ),
  );
  // Add scheduled syncs in this month too, so the dots aren't only past-events.
  for (const s of upcomingSyncs) {
    if (s.scheduledAt.getMonth() === now.getMonth() && s.scheduledAt.getFullYear() === now.getFullYear()) {
      if (!eventDays.includes(s.scheduledAt.getDate())) eventDays.push(s.scheduledAt.getDate());
    }
  }

  // ------ Recent projects (up to 3, prefer active by created desc). ------
  const recentProjects = [...projects]
    .sort((a, b) => {
      const aActive = a.status === 'active' ? 0 : 1;
      const bActive = b.status === 'active' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);

  // ------ Workspace lookups for sync rendering. ------
  const workspaceById = new Map<string, (typeof orgWorkspaces)[number]>();
  for (const w of orgWorkspaces) workspaceById.set(w.id, w);
  const internsByWorkspace = new Map<string, { firstName: string | null; lastName: string | null; email: string }>();
  const internIds = Array.from(new Set(orgWorkspaces.map((w) => w.internId)));
  if (internIds.length > 0) {
    const internRows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, internIds));
    for (const w of orgWorkspaces) {
      const intern = internRows.find((u) => u.id === w.internId);
      if (intern) internsByWorkspace.set(w.id, intern);
    }
  }

  // ------ Workspace → project name for sync sub-meta. ------
  const projectByWorkspace = new Map<string, { id: string; name: string }>();
  for (const link of wsLinks) {
    const pid = internshipToProject.get(link.internshipId);
    if (!pid) continue;
    const proj = projects.find((p) => p.id === pid);
    if (proj) projectByWorkspace.set(link.id, { id: proj.id, name: proj.name });
  }

  // ------ Render. ------
  const weekdayLabels: [string, string, string, string, string, string, string] = (() => {
    const base = new Date(2024, 5, 2); // Sunday
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return fmt.format(d);
    }) as [string, string, string, string, string, string, string];
  })();
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    now,
  );

  const subtitle = isVerified
    ? tDash('subtitleDigest', { reviews: waitingReviewCount, syncs: upcomingSyncs.length })
    : tDash('subtitlePendingShort');

  return (
    <div className="db-shell">
      {/* ============ MAIN COLUMN ============ */}
      <div className="db-col-main">
        {/* ---------- Welcome band ---------- */}
        <div className="db-welcome">
          <div className="db-welcome-eyebrow">{eyebrow}</div>
          <h1>
            {greeting}, <span className="name">{user.firstName ?? 'there'}</span>
          </h1>
          <p>{subtitle}</p>

          {/* First-time experience checklist for companies. Hides once
              all 4 done or user dismisses. */}
          <div className="mt-6 max-w-2xl relative z-[1]">
            <FteChecklist
              role="company"
              userId={user.id}
              items={[
                {
                  key: 'completeOrg',
                  done: Boolean(org.logoUrl && org.description?.trim()),
                  href: '/onboarding/company',
                },
                {
                  key: 'firstProject',
                  done: projects.length > 0,
                  href: '/company/projects/new',
                },
                {
                  key: 'firstInternship',
                  done: internshipsList.length > 0,
                  href:
                    projects.length > 0
                      ? `/company/projects/${projects[0].id}/internships/new`
                      : '/company/projects/new',
                },
                {
                  key: 'verified',
                  done: isVerified,
                  href: '/account',
                },
              ]}
            />
          </div>

          {!isVerified && (
            <div
              role="status"
              className="mt-4 relative z-[1] flex items-start gap-3 p-4 rounded-lg border border-[var(--status-warn-bg)] bg-[var(--status-warn-bg)] max-w-2xl"
            >
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--status-warn-ink)] text-white text-[14px] font-semibold flex-shrink-0"
                title={tDash('verifyHeading')}
              >
                ◷
              </span>
              <div className="min-w-0">
                <p className="font-mono uppercase tracking-[0.06em] text-[11.5px] text-[var(--status-warn-ink)] mb-1">
                  {tDash('verifyHeading')} · {tDash('verifySla')}
                </p>
                <p className="text-[13.5px] text-[var(--ink-2)] leading-relaxed">
                  {tDash('verifyBody')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ---------- 4-tile KPI stats ---------- */}
        <div className="db-stats">
          <div className="db-stat proj">
            <span className="label">{tDash('kpiProjects')}</span>
            <span className="value">
              {activeProjectsCount} <small>{tDash('kpiProjectsActive')}</small>
            </span>
            <span className={`delta${projectsCreatedLastWeek === 0 ? ' muted' : ''}`}>
              {tDash('kpiProjectsDelta', { n: projectsCreatedLastWeek })}
            </span>
          </div>
          <div className="db-stat review">
            <span className="label">{tDash('kpiReview')}</span>
            <span className="value">
              {waitingReviewCount} <small>{tDash('kpiReviewItems', { n: waitingReviewCount })}</small>
            </span>
            <span className={`delta${waitingReviewCount > 0 ? ' warn' : ' muted'}`}>
              {waitingReviewCount === 0 || !oldestReview
                ? tDash('kpiReviewEmpty')
                : tDash('kpiReviewOldest', { age: shortAge(oldestReview, now) })}
            </span>
          </div>
          <div className="db-stat app">
            <span className="label">{tDash('kpiApps')}</span>
            <span className="value">
              {newApplicationsCount} <small>{tDash('kpiAppsThisWeek')}</small>
            </span>
            <span className={`delta${appsDelta === 0 ? ' muted' : ''}`}>
              {tDash('kpiAppsDelta', { n: appsDelta })}
            </span>
          </div>
          <div className="db-stat team">
            <span className="label">{tDash('kpiTeam')}</span>
            <span className="value">
              {internCount + supervisorCount}{' '}
              <small>{tDash('kpiTeamBreakdown', { interns: internCount, sups: supervisorCount })}</small>
            </span>
            <span className={`delta${internCount === 0 ? ' muted' : ''}`}>
              {internCount === 0 ? tDash('kpiTeamEmpty') : tDash('kpiTeamPace')}
            </span>
          </div>
        </div>

        {/* ---------- Recent projects ---------- */}
        <div className="db-card">
          <div className="db-card-head">
            <h3>{tDash('recentTitle')}</h3>
            <Link href="/company/projects" className="db-link">
              {tDash('recentSeeAll', { n: projects.length })}
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="db-tasks-empty">
              <p>{tDash('recentEmpty')}</p>
              <Link
                href="/company/projects/new"
                className="inline-flex items-center h-9 px-4 mt-3 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
              >
                {tDash('createProjectCta')}
              </Link>
            </div>
          ) : (
            <div className="db-projects">
              {recentProjects.map((p) => {
                const code = projectCode(p.name);
                const color = tintFor(p.id);
                const startDate = p.startDate ? new Date(p.startDate) : null;
                const endDate = p.endDate ? new Date(p.endDate) : null;
                const totalWeeks =
                  startDate && endDate
                    ? Math.max(
                        1,
                        Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY / 7),
                      )
                    : null;
                const currentWeek =
                  startDate && totalWeeks
                    ? Math.min(
                        totalWeeks,
                        Math.max(
                          1,
                          Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1,
                        ),
                      )
                    : null;
                const rollup = tasksByProject[p.id] ?? { done: 0, total: 0 };
                const progress =
                  rollup.total > 0
                    ? Math.round((rollup.done / rollup.total) * 100)
                    : currentWeek && totalWeeks
                      ? Math.round((currentWeek / totalWeeks) * 100)
                      : 0;
                return (
                  <Link href={`/company/projects/${p.id}`} className="db-mini-card" key={p.id}>
                    <div className="top">
                      <span className="mark" style={{ background: color }} aria-hidden>
                        {code}
                      </span>
                      <span className="name">{p.name}</span>
                    </div>
                    <div className="progress">
                      <div className="row">
                        <span>
                          {currentWeek && totalWeeks
                            ? tDash('recentWeekOf', { current: currentWeek, total: totalWeeks })
                            : tDash('recentNoClock')}
                        </span>
                        <b>{progress}%</b>
                      </div>
                      <div className="bar">
                        <div
                          className={`fill${progress >= 50 ? ' cyan' : ''}`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- Today's tasks ---------- */}
        <div className="db-card">
          <div className="db-card-head">
            <h3>{tDash('tasksTitle')}</h3>
            <span className="sub">
              {tDash('tasksOpen', { n: taskRows.filter((t) => t.status !== 'done').length })}
            </span>
            <Link href="/company/projects" className="db-link">
              {tDash('tasksViewAll')}
            </Link>
          </div>
          {taskRows.length === 0 ? (
            <div className="db-tasks-empty">{tDash('tasksEmpty')}</div>
          ) : (
            <div className="db-tasks">
              {taskRows.map((t) => {
                const statusClass = TASK_STATUS_CLASS[t.status ?? 'todo'] ?? 'todo';
                const isDone = statusClass === 'done';
                const projectId = workspaceToProject.get(t.workspaceId);
                const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
                const statusLabel =
                  statusClass === 'review'
                    ? tDash('tasksStatusReview')
                    : statusClass === 'progress'
                      ? tDash('tasksStatusProgress')
                      : statusClass === 'done'
                        ? tDash('tasksStatusDone')
                        : tDash('tasksStatusTodo');
                const linkHref = projectId
                  ? `/company/projects/${projectId}`
                  : '/company/projects';
                const assignee = internsByWorkspace.get(t.workspaceId);
                const initials = assignee
                  ? initialsOf(assignee.firstName, assignee.lastName, assignee.email)
                  : initialsOf(user.firstName, user.lastName, user.email);
                return (
                  <Link
                    href={linkHref}
                    className={`db-task${isDone ? ' done' : ''}`}
                    key={t.id}
                  >
                    <span className="check" aria-hidden />
                    <span className="name">{t.title}</span>
                    <span className="proj-chip">{project?.name ?? org.name}</span>
                    <span className={`status ${statusClass}`}>{statusLabel}</span>
                    <span className="db-avatar" aria-hidden>
                      {initials}
                    </span>
                    <span className="chev" aria-hidden />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============ RIGHT RAIL ============ */}
      <div className="db-col-side">
        <CalendarWidget
          now={now}
          eventDays={eventDays}
          weekdayLabels={weekdayLabels}
          monthLabel={monthLabel}
          eyebrow={tDash('calendarEyebrow')}
        />

        <div className="db-card">
          <div className="db-card-head">
            <h3>{tDash('syncsTitle')}</h3>
            <Link
              href={activeProjects[0] ? `/company/projects/${activeProjects[0].id}` : '/company/projects'}
              className="db-link"
            >
              {tDash('syncsSchedule')}
            </Link>
          </div>
          {upcomingSyncs.length === 0 ? (
            <div className="db-meet-empty">
              {tDash('syncsEmpty')}{' '}
              <Link
                href={activeProjects[0] ? `/company/projects/${activeProjects[0].id}` : '/company/projects'}
              >
                {tDash('syncsScheduleLink')}
              </Link>
            </div>
          ) : (
            <div className="db-meet">
              {upcomingSyncs.map((s) => {
                const day = s.scheduledAt;
                const isToday =
                  day.getFullYear() === now.getFullYear() &&
                  day.getMonth() === now.getMonth() &&
                  day.getDate() === now.getDate();
                const timeLabel = new Intl.DateTimeFormat(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(day);
                const dayLabel = isToday
                  ? tDash('syncsToday')
                  : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day);
                const project = projectByWorkspace.get(s.workspaceId);
                const intern = internsByWorkspace.get(s.workspaceId);
                const internInitials = intern
                  ? initialsOf(intern.firstName, intern.lastName, intern.email)
                  : null;
                return (
                  <div className="db-meet-row" key={s.id}>
                    <div className="db-meet-time">
                      <span className="day">{timeLabel}</span>
                      {dayLabel}
                    </div>
                    <div className="db-meet-body">
                      <div className="title">
                        {s.note ??
                          (project ? `Weekly check-in · ${project.name}` : 'Weekly check-in')}
                      </div>
                      <div className="sub">
                        {tDash('syncsDurationMin', { n: s.durationMinutes })}
                        {s.meetingUrl ? ' · Jitsi' : ''}
                        {intern
                          ? ` · ${intern.firstName ?? intern.email}`
                          : ''}
                      </div>
                      {internInitials && (
                        <div className="who">
                          <span className="db-avatar" aria-hidden>
                            {internInitials}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
