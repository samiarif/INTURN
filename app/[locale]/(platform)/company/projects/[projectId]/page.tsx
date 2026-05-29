// Project Hub — supervisor's roll-up screen for ONE project.
// Sits under (platform) → keeps the PlatformHeader (NOT the workspace shell).
// Design ref: docs/design-bundle/project/mocks/project-hub.{jsx,css} (PDF p.07).
// All literals here are scope-cut English; TODO i18n when this stops being
// the only design-polished hub view.
import Link from 'next/link';
import { Milestone, Users, Plus } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { inArray, eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  applications,
  tasks,
  deliverables,
  workspaces,
  users,
  profiles,
  organizations,
  events,
} from '@/db/schema';
import { getSession } from '@/modules/auth/session';
import { getProjectById, getProjectsByOrganization } from '@/modules/projects/queries';
import { getInternshipsByProject } from '@/modules/internships/queries';
import { getActiveMembership, canManageOrg } from '@/modules/team/authz';
import { getOrgMembers } from '@/modules/team/queries';
import {
  ProjectSupervisors,
  type SupervisorCandidate,
} from '@/modules/projects/components/project-supervisors';
import { PublishInternshipButton } from './_publish-button';
import {
  CloseInternshipButton,
  UnpublishInternshipButton,
} from './_lifecycle-buttons';
import { EditGoalsPhasesDialog } from '@/modules/projects/components/edit-goals-phases-dialog';

// ---------------------------------------------------------------------------
// Helpers (pure — easy to test later if any of this grows hair).
// ---------------------------------------------------------------------------

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function initialsOf(first?: string | null, last?: string | null): string {
  const a = (first ?? '').trim()[0] ?? '';
  const b = (last ?? '').trim()[0] ?? '';
  return (a + b).toUpperCase() || '·';
}

/** Two-letter mark from the first two words. "Visual designer" → "VD". */
function internshipCode(title: string): string {
  const parts = title.split(/[\s·—\-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '').toUpperCase().replace(/[^A-Z]/i, '');
}

function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
}

function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

/** Active 1-based phase index, or -1 if we're outside the project clock. */
function computeCurrentPhase(
  phases: Array<{ fromWeek: number; toWeek: number }>,
  startDate: Date | null,
  now = new Date(),
): number {
  if (!startDate || phases.length === 0) return 0;
  const elapsedWeeks = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1;
  for (let i = 0; i < phases.length; i++) {
    if (elapsedWeeks >= phases[i].fromWeek && elapsedWeeks <= phases[i].toWeek) return i;
  }
  // Past the last phase → consider the project at handoff.
  return Math.max(0, phases.length - 1);
}

// ---------------------------------------------------------------------------
// Page.
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)] border-[var(--border-color)]',
  active:
    'bg-[var(--status-success-bg)] text-[var(--status-success-ink)] border-[color-mix(in_srgb,var(--status-success-ink)_28%,transparent)]',
  archived: 'bg-[var(--surface-muted)] text-[var(--ink-4)] border-[var(--border-color)]',
};

const INTERNSHIP_STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)]',
  published: 'bg-[var(--status-success-bg)] text-[var(--status-success-ink)]',
  closed: 'bg-[var(--surface-muted)] text-[var(--ink-4)]',
  archived: 'bg-[var(--surface-muted)] text-[var(--ink-4)]',
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { user, role } = session;
  const t = await getTranslations('projectHub');
  const tStatus = await getTranslations('company.internshipStatus');
  const { published } = await searchParams;

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();
  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound();
  const isSupervisor = project.supervisorIds?.includes(user.id) ?? role === 'admin';

  const internships = await getInternshipsByProject(projectId);
  const internshipIds = internships.map((i) => i.id);
  const supervisorIds = project.supervisorIds ?? [];

  // ------ Fan-out (everything is independent here). ------
  const [
    applicationCounts,
    workspaceRows,
    supervisorUsers,
    organization,
    recentEvents,
    viewerMembership,
  ] = await Promise.all([
      internshipIds.length > 0
        ? db
            .select({ internshipId: applications.internshipId, count: applications.id })
            .from(applications)
            .where(inArray(applications.internshipId, internshipIds))
        : Promise.resolve([]),
      // Workspaces under any internship of this project → join intern user + profile.
      internshipIds.length > 0
        ? db
            .select({
              workspace: workspaces,
              intern: users,
              profile: profiles,
            })
            .from(workspaces)
            .innerJoin(users, eq(users.id, workspaces.internId))
            .leftJoin(profiles, eq(profiles.userId, users.id))
            .where(inArray(workspaces.internshipId, internshipIds))
        : Promise.resolve([]),
      supervisorIds.length > 0
        ? db.select().from(users).where(inArray(users.id, supervisorIds))
        : Promise.resolve([]),
      db
        .select()
        .from(organizations)
        .where(eq(organizations.id, project.organizationId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      // Recent events feed for the "This week" rail. Targets any task/deliv under
      // any workspace under this project — fan in via the workspace IDs.
      (async () => {
        // We don't have the workspace IDs yet without the row above. Cheapest
        // path: select workspace IDs again (tiny, indexed); events query then
        // gets a target set.
        if (internshipIds.length === 0) return [];
        const wsIds = await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(inArray(workspaces.internshipId, internshipIds));
        const ids = wsIds.map((w) => w.id);
        if (ids.length === 0) return [];
        return db
          .select()
          .from(events)
          .where(inArray(events.targetId, ids))
          .orderBy(desc(events.createdAt))
          .limit(8);
      })(),
      getActiveMembership(user.id, project.organizationId),
    ]);

  // ------ Second batch (depends on the workspace ids). ------
  const workspaceIds = workspaceRows.map((r) => r.workspace.id);
  const [taskRows, deliverableRows] = await Promise.all([
    workspaceIds.length > 0
      ? db.select().from(tasks).where(inArray(tasks.workspaceId, workspaceIds))
      : Promise.resolve([]),
    workspaceIds.length > 0
      ? db.select().from(deliverables).where(inArray(deliverables.workspaceId, workspaceIds))
      : Promise.resolve([]),
  ]);

  // ------ Rollups. ------
  const countByInternship = applicationCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.internshipId] = (acc[row.internshipId] ?? 0) + 1;
    return acc;
  }, {});

  const internsByInternship = new Map<
    string,
    { intern: typeof users.$inferSelect; profile: typeof profiles.$inferSelect | null }
  >();
  for (const row of workspaceRows) {
    internsByInternship.set(row.workspace.internshipId, {
      intern: row.intern,
      profile: row.profile,
    });
  }

  const tasksByWorkspace = new Map<string, typeof taskRows>();
  for (const t of taskRows) {
    const arr = tasksByWorkspace.get(t.workspaceId) ?? [];
    arr.push(t);
    tasksByWorkspace.set(t.workspaceId, arr);
  }
  const delivsByWorkspace = new Map<string, typeof deliverableRows>();
  for (const d of deliverableRows) {
    const arr = delivsByWorkspace.get(d.workspaceId) ?? [];
    arr.push(d);
    delivsByWorkspace.set(d.workspaceId, arr);
  }
  const workspaceByInternship = new Map<string, string>();
  for (const r of workspaceRows) {
    workspaceByInternship.set(r.workspace.internshipId, r.workspace.id);
  }

  // ------ Project-wide tallies. ------
  const totalSlots = internships.reduce((s, i) => s + (i.internCount ?? 1), 0);
  const filledSlots = workspaceRows.length;
  const activeInternshipCount = internships.filter((i) => i.status !== 'draft').length;
  const draftInternshipCount = internships.filter((i) => i.status === 'draft').length;
  const allTasks = taskRows;
  const openTasks = allTasks.filter((t) => t.status !== 'done').length;
  const doneTasks = allTasks.filter((t) => t.status === 'done').length;
  const reviewTasks = allTasks.filter((t) => t.status === 'review').length;
  const allDelivs = deliverableRows;
  const submittedDelivs = allDelivs.filter((d) =>
    ['submitted', 'approved', 'revision-requested'].includes(d.status ?? ''),
  ).length;
  const approvedDelivs = allDelivs.filter((d) => d.status === 'approved').length;
  const pendingDelivs = allDelivs.filter((d) => d.status === 'submitted').length;

  const startDate = project.startDate ? new Date(project.startDate) : null;
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const today = new Date();
  const daysRemaining = endDate
    ? Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / MS_PER_DAY))
    : null;
  const durationWeeks =
    startDate && endDate
      ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY / 7))
      : null;
  const currentWeek = startDate
    ? Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1)
    : null;

  const phases = (project.phases ?? []) as Array<{
    name: string;
    description?: string;
    fromWeek: number;
    toWeek: number;
  }>;
  const goals = (project.goals ?? []) as string[];
  const currentPhaseIdx = computeCurrentPhase(phases, startDate);
  // Width of the brand→accent fill on the phase strip. Spans midpoint of "done"
  // pip to midpoint of the current "now" pip.
  const phaseProgressPct =
    phases.length === 0 ? 0 : ((currentPhaseIdx + 0.5) / phases.length) * 100;

  // Rough on-pace heuristic for the Project signal card: tasks closed-or-in-flight
  // out of total. Cheap, no separate tracking column needed.
  const onPacePct =
    allTasks.length === 0
      ? 100
      : Math.round(((allTasks.length - openTasks + reviewTasks) / allTasks.length) * 100);

  // ------ Manage-supervisors affordance (org owner/admin only). ------
  // setSupervisorProjectsAction is user-centric (replaces a member's full set),
  // so the toggle UI needs each candidate's current org-wide project ids. We
  // only fetch the candidate set + project map for managers — supervisors never
  // see this control, so the common path skips these extra reads.
  const canManageSupervisors = canManageOrg(viewerMembership?.role);
  let supervisorCandidates: SupervisorCandidate[] = [];
  const supervisorProjectIdsByUser: Record<string, string[]> = {};
  if (canManageSupervisors) {
    const [orgMembers, orgProjects] = await Promise.all([
      getOrgMembers(project.organizationId),
      getProjectsByOrganization(project.organizationId),
    ]);
    const eligible = orgMembers.filter(
      (m) =>
        m.status === 'active' &&
        !!m.userId &&
        (m.role === 'owner' || m.role === 'admin' || m.role === 'supervisor'),
    );
    const candidateIds = eligible.map((m) => m.userId as string);
    const candidateUsers =
      candidateIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, candidateIds))
        : [];
    const nameById = new Map(
      candidateUsers.map((u) => [
        u.id,
        [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
      ]),
    );
    supervisorCandidates = eligible.map((m) => {
      const userId = m.userId as string;
      return { userId, name: nameById.get(userId) || m.email, role: m.role };
    });
    for (const p of orgProjects) {
      for (const uid of p.supervisorIds ?? []) {
        (supervisorProjectIdsByUser[uid] ??= []).push(p.id);
      }
    }
  }

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-7 pt-6 pb-20">
        {/* =============== Publish banner =============== */}
        {published === '1' && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md bg-[var(--status-success-bg)] border border-[color-mix(in_srgb,var(--status-success-ink)_28%,transparent)] text-[var(--status-success-ink)] text-label font-medium">
            <span className="w-2 h-2 rounded-full bg-[var(--status-success-ink)] flex-shrink-0" />
            Internship published to the marketplace.
          </div>
        )}
        {published === 'blocked' && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md bg-[var(--status-warn-bg)] border border-[color-mix(in_srgb,var(--status-warn-ink)_30%,transparent)] text-[var(--status-warn-ink)] text-label font-medium">
            <span className="w-2 h-2 rounded-full bg-[var(--status-warn-ink)] flex-shrink-0" />
            Saved as draft. Your organization must be verified before you can publish.
          </div>
        )}
        {/* =============== Title bar =============== */}
        <header className="mb-4">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <h1 className="text-display font-[family-name:var(--font-display)] text-[var(--ink)]">
              {project.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-eyebrow font-mono uppercase border ${
                STATUS_BADGE_STYLE[project.status]
              }`}
            >
              {project.status === 'active' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-ink)]" />
              )}
              {project.status}
            </span>
            {startDate && endDate && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-eyebrow font-mono text-[var(--ink-3)] bg-[var(--surface)] border border-[var(--border-color)]">
                {formatDateShort(startDate)} — {formatDateShort(endDate)}
                {durationWeeks ? ` · ${durationWeeks} WK` : ''}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {isSupervisor && (
                <Link
                  href={`/company/projects/${projectId}/edit`}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-label border border-[var(--border-color)] text-[var(--ink-2)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
                >
                  {t('editProject')}
                </Link>
              )}
              <Link
                href={`/company/projects/${projectId}/internships/new`}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-label bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
              >
                {t('addInternship')}
              </Link>
            </div>
          </div>
        </header>

        {/* =============== Two-column body =============== */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start mt-6">
          {/* ============ Main column ============ */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* ----- Brief card ----- */}
            <section className="ph-brief">
              <div>
                <div className="ph-eyebrow">
                  Project
                  <span className="sep">·</span>
                  {durationWeeks ? `${durationWeeks} weeks` : 'Open-ended'}
                  <span className="sep">·</span>
                  {internships.length} internships
                  {project.organizationId && organization?.city && (
                    <>
                      <span className="sep">·</span>
                      {organization.city.toUpperCase()}
                    </>
                  )}
                </div>
                <h2 className="ph-brief-title">{project.name}</h2>
                {project.brief && <p className="ph-brief-desc">{project.brief}</p>}

                {goals.length > 0 ? (
                  <>
                    <ul className="ph-goals">
                      {goals.slice(0, 3).map((g, i) => {
                        const dotIdx = g.indexOf('.');
                        const lead = dotIdx > 0 ? g.slice(0, dotIdx + 1) : g;
                        const rest = dotIdx > 0 ? g.slice(dotIdx + 1) : '';
                        return (
                          <li key={i}>
                            <b>{lead}</b>
                            {rest}
                          </li>
                        );
                      })}
                    </ul>
                    {isSupervisor && (
                      <div className="mb-2">
                        <EditGoalsPhasesDialog
                          projectId={project.id}
                          mode="goals"
                          initialGoals={goals}
                          trigger={{ label: t('editGoals') }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-caption text-[var(--ink-3)] italic">{t('noGoals')}</span>
                    {isSupervisor && (
                      <EditGoalsPhasesDialog
                        projectId={project.id}
                        mode="goals"
                        initialGoals={[]}
                        trigger={{ label: t('addGoals') }}
                      />
                    )}
                  </div>
                )}

                <div className="ph-brief-meta">
                  <span>
                    Created <b>{formatDateShort(project.createdAt)}</b>
                  </span>
                  {supervisorUsers[0] && (
                    <>
                      <span className="pip" />
                      <span>
                        by{' '}
                        <b>
                          {supervisorUsers[0].firstName} {supervisorUsers[0].lastName}
                        </b>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <aside className="ph-brief-team">
                <h6>Project team</h6>
                {supervisorUsers.map((s) => (
                  <div key={s.id} className="ph-brief-team-row">
                    <span className="ph-avatar company">{initialsOf(s.firstName, s.lastName)}</span>
                    <div className="meta">
                      <div className="name">
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="role">Supervisor</div>
                    </div>
                  </div>
                ))}
                <div className="ph-brief-team-row">
                  <div className="flex -space-x-2">
                    {workspaceRows.slice(0, 3).map((r) => (
                      <span key={r.workspace.id} className="ph-avatar">
                        {initialsOf(r.intern.firstName, r.intern.lastName)}
                      </span>
                    ))}
                    {workspaceRows.length === 0 && (
                      <span className="ph-avatar !bg-transparent !border-dashed !border-[var(--border-color)] !text-[var(--ink-4)]">
                        ?
                      </span>
                    )}
                  </div>
                  <div className="meta">
                    <div className="name">{filledSlots} interns placed</div>
                    <div className="role">{Math.max(0, totalSlots - filledSlots)} open slots</div>
                  </div>
                </div>
              </aside>
            </section>

            {/* ----- Phase strip ----- */}
            {phases.length > 0 ? (
              <section className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Milestone size={16} strokeWidth={2.25} className="text-[var(--brand-600)] shrink-0" />
                  <h3 className="text-heading text-[var(--ink)] font-[family-name:var(--font-display)]">
                    {t('projectPhases')}
                  </h3>
                  {isSupervisor && (
                    <EditGoalsPhasesDialog
                      projectId={project.id}
                      mode="phases"
                      initialPhases={phases}
                      trigger={{ label: t('editPhases'), className: 'text-caption text-[var(--ink-3)] hover:text-[var(--brand-700)] hover:underline' }}
                    />
                  )}
                  <span className="ml-auto inline-flex items-center gap-2.5">
                    <span className="text-eyebrow font-mono uppercase text-[var(--ink-4)]">
                      PHASE {currentPhaseIdx + 1} OF {phases.length}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-ink)] text-[10.5px] font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-ink)]" />
                      On track
                    </span>
                  </span>
                </div>
                <div
                  className="ph-phase-strip"
                  style={
                    {
                      // Position the progress fill at the midpoint of the active pip.
                      '--ph-progress': `${phaseProgressPct}%`,
                    } as React.CSSProperties
                  }
                >
                  {phases.map((p, i) => {
                    const state =
                      i < currentPhaseIdx ? 'done' : i === currentPhaseIdx ? 'now' : 'upcoming';
                    return (
                      <div key={i} className={`ph-phase ${state}`}>
                        <span className="pip" />
                        <div className="num">
                          PHASE {String(i + 1).padStart(2, '0')}
                          {state === 'now' ? ' · NOW' : ''}
                        </div>
                        <div className="name">{p.name}</div>
                        <div className="wks">
                          Wk {p.fromWeek} → {p.toWeek}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-color)] bg-[var(--surface)] p-5 text-center text-caption text-[var(--ink-3)]">
                <div>{t('noPhases')}</div>
                {isSupervisor && (
                  <div className="mt-2">
                    <EditGoalsPhasesDialog
                      projectId={project.id}
                      mode="phases"
                      initialPhases={[]}
                      trigger={{ label: t('addPhases') }}
                    />
                  </div>
                )}
              </section>
            )}

            {/* ----- 4 stat tiles ----- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile
                label={t('statInternships')}
                value={String(activeInternshipCount)}
                sublabel="active"
                footer={
                  draftInternshipCount > 0
                    ? `${filledSlots} filled · ${draftInternshipCount} draft`
                    : filledSlots > 0
                      ? `Both filled · no draft`
                      : 'No interns placed yet'
                }
              />
              <StatTile
                label={t('statTasks')}
                value={String(openTasks)}
                sublabel={`of ${allTasks.length} open`}
                footer={`${doneTasks} done · ${reviewTasks} in review`}
              />
              <StatTile
                label={t('statDeliverables')}
                value={String(submittedDelivs)}
                sublabel={`of ${allDelivs.length}`}
                footer={
                  pendingDelivs > 0
                    ? `${pendingDelivs} needs review · ${approvedDelivs} approved`
                    : `${approvedDelivs} approved`
                }
                footerKind="good"
              />
              <StatTile
                label={t('statDays')}
                value={daysRemaining != null ? String(daysRemaining) : '—'}
                sublabel="days"
                footer={endDate ? `Ends ${formatDateLong(endDate)}` : 'No end date set'}
              />
            </div>

            {/* ----- Internships roster ----- */}
            <section className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} strokeWidth={2.25} className="text-[var(--brand-600)] shrink-0" />
                <h3 className="text-heading text-[var(--ink)] font-[family-name:var(--font-display)]">
                  {t('internships')}
                </h3>
                <Link
                  href={`/company/projects/${projectId}/applications`}
                  className="ml-auto text-caption text-[var(--ink-3)] hover:text-[var(--ink)] inline-flex items-center gap-1"
                >
                  {t('viewApplications')}
                </Link>
              </div>

              {internships.length === 0 ? (
                <div className="text-center py-8 text-caption text-[var(--ink-3)]">
                  {t('noInternships')}
                </div>
              ) : (
                <div className="flex flex-col -mx-1">
                  {internships.map((i) => {
                    const intern = internsByInternship.get(i.id);
                    const wsId = workspaceByInternship.get(i.id);
                    const wsTasks = wsId ? (tasksByWorkspace.get(wsId) ?? []) : [];
                    const wsDelivs = wsId ? (delivsByWorkspace.get(wsId) ?? []) : [];
                    const wsTasksDone = wsTasks.filter((t) => t.status === 'done').length;
                    const wsDelivsSubmitted = wsDelivs.filter((d) =>
                      ['submitted', 'approved', 'revision-requested'].includes(d.status ?? ''),
                    ).length;
                    const wsInReview = wsDelivs.filter((d) => d.status === 'submitted').length;
                    const filledSuffix = intern ? 'filled' : 'open';
                    const idShort = i.id.slice(0, 8).toUpperCase();
                    return (
                      <div className="ph-intern" key={i.id}>
                        <div className="ph-code-mark">{internshipCode(i.title)}</div>
                        <div className="ph-intern-role">
                          <div className="role-name">{i.title}</div>
                          <div className="role-meta">
                            INT-{idShort} · {i.internCount ?? 1} slot · {filledSuffix}
                          </div>
                        </div>
                        <div className="ph-intern-person">
                          {intern ? (
                            <>
                              <span className="ph-avatar">
                                {initialsOf(intern.intern.firstName, intern.intern.lastName)}
                              </span>
                              <div className="who">
                                <div className="pn">
                                  {intern.intern.firstName} {intern.intern.lastName}
                                </div>
                                <div className="pm">
                                  {intern.profile?.university ?? '—'}
                                  {intern.profile?.yearOfStudy
                                    ? ` · ${intern.profile.yearOfStudy}`
                                    : ''}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="ph-avatar !bg-transparent !border-dashed !border-[var(--border-color)] !text-[var(--ink-4)]">
                                ?
                              </span>
                              <div className="who">
                                <div className="pn text-[var(--ink-3)] italic">
                                  {countByInternship[i.id]
                                    ? `${countByInternship[i.id]} applicants`
                                    : 'Awaiting candidate'}
                                </div>
                                <div className="pm">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium font-mono uppercase tracking-wider ${
                                      INTERNSHIP_STATUS_STYLE[i.status ?? 'draft']
                                    }`}
                                  >
                                    {i.status}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="ph-intern-prog">
                          <div className="col">
                            <span className="label">Tasks</span>
                            <span className="value">
                              {wsTasksDone} / {wsTasks.length || 0}
                            </span>
                          </div>
                          <div className="col">
                            <span className="label">Deliv.</span>
                            <span className="value">
                              {wsDelivsSubmitted} / {wsDelivs.length || 0}
                            </span>
                          </div>
                          <div className="col">
                            <span className="label">Status</span>
                            <span className="value">
                              <small>
                                {wsInReview > 0
                                  ? `${wsInReview} in review`
                                  : intern
                                    ? 'On track'
                                    : '—'}
                              </small>
                            </span>
                          </div>
                        </div>
                        <div className="ph-intern-actions">
                          {/* Status-appropriate lifecycle controls (S2-B).
                              draft → Edit + Publish; published → Edit +
                              Unpublish + Close; closed/archived → muted label. */}
                          {isSupervisor &&
                            (i.status === 'draft' || i.status === 'published') && (
                              <Link
                                href={`/company/projects/${projectId}/internships/${i.id}/edit`}
                                className="text-label text-[var(--ink-3)] hover:text-[var(--ink)]"
                              >
                                {t('editInternship')}
                              </Link>
                            )}
                          {isSupervisor && i.status === 'draft' && (
                            <PublishInternshipButton internshipId={i.id} />
                          )}
                          {isSupervisor && i.status === 'published' && (
                            <>
                              <UnpublishInternshipButton internshipId={i.id} />
                              <CloseInternshipButton internshipId={i.id} />
                            </>
                          )}
                          {(i.status === 'closed' || i.status === 'archived') && (
                            <span className="text-label text-[var(--ink-4)]">
                              {tStatus('closedLabel')}
                            </span>
                          )}
                          {wsId ? (
                            <Link href={`/company/workspaces/${wsId}`} className="ph-intern-open">
                              {t('openWorkspace')}
                            </Link>
                          ) : (
                            <Link
                              href={`/company/projects/${projectId}/applications`}
                              className="ph-intern-open"
                            >
                              {t('applicationsLink')}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Link
                href={`/company/projects/${projectId}/internships/new`}
                className="ph-add-intern"
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[var(--surface-muted)] text-[var(--ink-2)]">
                  <Plus size={11} strokeWidth={2.5} aria-hidden />
                </span>
                Add another internship under this project
              </Link>
            </section>
          </div>

          {/* ============ Side rail ============ */}
          <aside className="flex flex-col gap-4">
            {/* Project signal */}
            <div className="ph-signal">
              <div className="ph-signal-head">
                <h4>{t('projectSignal')}</h4>
                <span className="ml-auto ph-signal-tag">DATA · LIVE</span>
              </div>
              <div className="ph-signal-metric">
                <b>
                  {onPacePct}
                  <span style={{ fontSize: 16, marginLeft: 2 }}>%</span>
                </b>
                <span className="delta">on-pace, both roles</span>
              </div>
              <div className="ph-signal-bench">
                {phases.length > 0 && currentPhaseIdx < phases.length ? (
                  <>
                    Phase {currentPhaseIdx + 1} runs through{' '}
                    <b>Wk {phases[currentPhaseIdx].toWeek}</b>. No interventions needed across
                    either workspace.
                  </>
                ) : (
                  <>No interventions needed across either workspace.</>
                )}
              </div>
              {/* Sparkline — visual placeholder using the mock's path until we
                  derive series from a real rolling-completion source. */}
              <svg
                className="ph-signal-spark"
                viewBox="0 0 280 36"
                preserveAspectRatio="none"
                role="img"
                aria-label="Project pace sparkline"
              >
                <defs>
                  <linearGradient id="phSparkGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--accent-500)" stopOpacity="0.35" />
                    <stop offset="1" stopColor="var(--accent-500)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,30 L 30,26 L 60,22 L 90,24 L 120,18 L 150,20 L 180,14 L 210,16 L 240,10 L 270,8 L 280,10 L 280,36 L 0,36 Z"
                  fill="url(#phSparkGrad)"
                />
                <path
                  d="M 0,30 L 30,26 L 60,22 L 90,24 L 120,18 L 150,20 L 180,14 L 210,16 L 240,10 L 270,8 L 280,10"
                  fill="none"
                  stroke="var(--accent-500)"
                  strokeWidth="1.5"
                />
                <circle cx="270" cy="8" r="3" fill="var(--accent-500)" />
              </svg>
            </div>

            {/* Project sync info — actual scheduling lives in each workspace's
                per-intern Schedule Check-In flow. */}
            <div className="ph-sync">
              <h4>{t('projectSync')}</h4>
              <p>{t('projectSyncBody')}</p>
            </div>

            {/* Supervisors & team */}
            <div className="ph-team-card">
              <div className="flex items-center gap-2">
                <h4>{t('supervisors')}</h4>
                {canManageSupervisors ? (
                  <ProjectSupervisors
                    orgId={project.organizationId}
                    projectId={project.id}
                    supervisorIds={supervisorIds}
                    candidates={supervisorCandidates}
                    projectIdsByUserId={supervisorProjectIdsByUser}
                    triggerClassName="ml-auto text-caption text-[var(--ink-3)] hover:text-[var(--brand-700)] hover:underline"
                  />
                ) : null}
              </div>
              <div className="ph-team-list">
                {supervisorUsers.map((s, idx) => (
                  <div key={s.id} className="ph-team-member">
                    <span className="ph-avatar company">{initialsOf(s.firstName, s.lastName)}</span>
                    <div>
                      <div className="nm">
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="rl">{idx === 0 ? t('leadSupervisor') : t('coSupervisor')}</div>
                    </div>
                    {idx === 0 && <span className="ld">LEAD</span>}
                  </div>
                ))}
                {workspaceRows.map((r) => {
                  const i = internships.find((ii) => ii.id === r.workspace.internshipId);
                  return (
                    <div key={r.workspace.id} className="ph-team-member">
                      <span className="ph-avatar">
                        {initialsOf(r.intern.firstName, r.intern.lastName)}
                      </span>
                      <div>
                        <div className="nm">
                          {r.intern.firstName} {r.intern.lastName}
                        </div>
                        <div className="rl">Intern · {i?.title ?? '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* This week */}
            <div className="ph-week">
              <h4>
                {t('thisWeek')} ·{' '}
                {today
                  .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  .toUpperCase()}
              </h4>
              <ul>
                {recentEvents.length > 0 ? (
                  recentEvents.slice(0, 4).map((e) => {
                    const cls =
                      e.type.includes('submitted') || e.type.includes('review')
                        ? 'urgent'
                        : e.type.includes('comment')
                          ? 'next'
                          : '';
                    return (
                      <li key={e.id} className={cls}>
                        <span className="dot" />
                        <span className="truncate">
                          {humanizeEventType(e.type)} ·{' '}
                          {formatRelative(new Date(e.createdAt), today)}
                        </span>
                      </li>
                    );
                  })
                ) : (
                  <li>
                    <span className="dot" />
                    No activity in this project yet.
                  </li>
                )}
                {currentWeek && currentPhaseIdx >= 0 && phases[currentPhaseIdx] && (
                  <li>
                    <span className="dot" />
                    Phase {currentPhaseIdx + 1} ends Wk {phases[currentPhaseIdx].toWeek}
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline subcomponents (kept here — they're not reused outside this page).
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  sublabel,
  footer,
  footerKind,
}: {
  label: string;
  value: string;
  sublabel?: string;
  footer?: string;
  footerKind?: 'good' | 'warn' | 'danger';
}) {
  const footerColor =
    footerKind === 'good'
      ? 'text-[var(--success)]'
      : footerKind === 'warn'
        ? 'text-[var(--warning)]'
        : footerKind === 'danger'
          ? 'text-[var(--danger)]'
          : 'text-[var(--ink-3)]';
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3.5 min-h-[88px] flex flex-col justify-center gap-1">
      <div className="text-eyebrow font-mono uppercase text-[var(--ink-3)]">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-title text-[var(--ink)]">{value}</span>
        {sublabel && (
          <span className="text-caption text-[var(--ink-3)] font-medium">{sublabel}</span>
        )}
      </div>
      {footer && <div className={`text-caption mt-0.5 ${footerColor}`}>{footer}</div>}
    </div>
  );
}

/** Human-readable label for an event type — keeps the rail readable. */
function humanizeEventType(type: string): string {
  const parts = type.split(/[._:-]/);
  const last = parts[parts.length - 1] ?? type;
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/_/g, ' ');
}

function formatRelative(date: Date, now: Date): string {
  const diff = Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
