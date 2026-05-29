// Projects index — supervisor's grid of every project under the org.
// Sits ABOVE Project Detail (the "Project Hub" at /company/projects/[id]).
// Lands here from PlatformHeader "Projects" and from Dashboard "See all".
//
// Design ref: design 05 §02 (mocks at docs/design-bundle/project/mocks/
// projects-index.{jsx,css}; PDF page-05.jpg). All `.pi-*` styles live at
// the bottom of app/globals.css with token names rebound to our globals.
// Server component, no client state.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getCurrentOrg } from '@/modules/team/authz';
import {
  getProjectsByOrganization,
  listCompanyProjectsWithStats,
} from '@/modules/projects/queries';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Two-letter mark from the first two words. "Brand audit" → "BA". */
function projectCode(name: string): string {
  const parts = name.split(/[\s·—\-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return ((a + b) || name.slice(0, 2)).toUpperCase();
}

/** Deterministic brand-ish tint for a project mark — same palette as dashboard. */
const PROJECT_TINTS = ['#8F1FFE', '#2563EB', '#06B6D4', '#E467FE', '#EA580C', '#16A34A'] as const;
function tintFor(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return PROJECT_TINTS[(h >>> 0) % PROJECT_TINTS.length];
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; status?: string; view?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'company' && session.role !== 'admin') {
    redirect(`/${session.role}/dashboard`);
  }
  const params = await searchParams;
  const showArchived = params.archived === 'true' || params.status === 'archived';
  const statusFilter: 'all' | 'active' | 'draft' | 'archived' =
    (params.status as 'all' | 'active' | 'draft' | 'archived' | undefined) ??
    (showArchived ? 'archived' : 'all');

  const current = await getCurrentOrg(session.user.id);
  if (!current) redirect('/onboarding/company');
  const org = current.org;

  // ------ Pull the project set up front. ------
  const allProjects = await getProjectsByOrganization(org.id);
  const projectIds = allProjects.map((p) => p.id);

  // ------ Fan-out: internships + workspace rollups + apps count. ------
  const now = new Date();

  const [{ internshipsList, workspaceRows, taskRows, appsThisWeek }, t] =
    await Promise.all([
      listCompanyProjectsWithStats(projectIds),
      getTranslations('projects.index'),
    ]);

  // ------ Roll the workspace bits up to (project, intern avatars, task counts). ------
  const internshipToProject = new Map<string, string>();
  for (const i of internshipsList) {
    if (i.projectId) internshipToProject.set(i.id, i.projectId);
  }
  const workspaceToProject = new Map<string, string>();
  for (const w of workspaceRows) {
    const pid = internshipToProject.get(w.internshipId);
    if (pid) workspaceToProject.set(w.id, pid);
  }

  // Tasks done / total per project.
  const tasksByProject = new Map<string, { done: number; total: number }>();
  for (const t of taskRows) {
    const pid = workspaceToProject.get(t.workspaceId);
    if (!pid) continue;
    const bucket = tasksByProject.get(pid) ?? { done: 0, total: 0 };
    bucket.total++;
    if (t.status === 'done') bucket.done++;
    tasksByProject.set(pid, bucket);
  }

  // Internship count per project.
  const internshipCountByProject = new Map<string, number>();
  for (const i of internshipsList) {
    if (!i.projectId) continue;
    internshipCountByProject.set(i.projectId, (internshipCountByProject.get(i.projectId) ?? 0) + 1);
  }

  // Active workspace count per project — feeds the "Active" stat tile.
  const activeWsByProject = new Map<string, number>();
  for (const w of workspaceRows) {
    const pid = internshipToProject.get(w.internshipId);
    if (!pid || w.status !== 'active') continue;
    activeWsByProject.set(pid, (activeWsByProject.get(pid) ?? 0) + 1);
  }

  // ------ Filter set actually rendered. ------
  const visibleProjects = allProjects
    .filter((p) => {
      if (statusFilter === 'all') return p.status !== 'archived';
      return p.status === statusFilter;
    })
    .sort((a, b) => {
      // Active first, then draft, then archived; tie-break by createdAt desc.
      const rank = (s: string) => (s === 'active' ? 0 : s === 'draft' ? 1 : 2);
      const ra = rank(a.status);
      const rb = rank(b.status);
      if (ra !== rb) return ra - rb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // ------ Top stat tiles. ------
  const totalProjects = allProjects.length;
  const activeProjectCount = allProjects.filter((p) => p.status === 'active').length;
  const newAppsCount = appsThisWeek.length;

  // ------ Date helper. ------
  const dateNow = now;

  return (
    <div className="pi-shell">
      {/* =============== Title row =============== */}
      <header className="pi-head">
        <div className="pi-head-main">
          <div className="pi-head-title-row">
            <h1>{t('title')}</h1>
            <span className="pi-head-badge">{org.name}</span>
            <div className="pi-head-actions">
              <Link
                href={
                  statusFilter === 'archived' ? '/company/projects' : '/company/projects?status=archived'
                }
                className="pi-head-link"
              >
                {statusFilter === 'archived' ? t('showActive') : t('archived')}
              </Link>
              <Link href="/company/projects/new" className="pi-head-btn">
                <span aria-hidden>+</span> {t('addProject')}
              </Link>
            </div>
          </div>
          <p className="pi-head-sub">{t('subtitle', { org: org.name })}</p>
        </div>
      </header>

      {/* =============== Top stat tiles =============== */}
      <div className="pi-stats">
        <div className="pi-stat projects">
          <span className="ico" aria-hidden />
          <div>
            <div className="label">{t('statProjects')}</div>
            <div className="value">
              {totalProjects} <small>{t('statProjectsSub')}</small>
            </div>
          </div>
        </div>
        <div className="pi-stat active">
          <span className="ico" aria-hidden />
          <div>
            <div className="label">{t('statActive')}</div>
            <div className="value">
              {activeProjectCount} <small>{t('statActiveSub')}</small>
            </div>
          </div>
        </div>
        <div className="pi-stat apps">
          <span className="ico" aria-hidden />
          <div>
            <div className="label">{t('statApps')}</div>
            <div className="value">
              {newAppsCount} <small>{t('statAppsSub')}</small>
            </div>
          </div>
        </div>
      </div>

      {/* =============== Toolbar =============== */}
      <div className="pi-toolbar">
        <div className="pi-view" role="tablist" aria-label={t('viewToggle')}>
          <span className="pi-view-btn active" role="tab" aria-selected="true">
            <span className="ic grid" aria-hidden>
              <span /><span /><span /><span />
            </span>
            {t('viewGrid')}
          </span>
          {/* List view will land in a follow-up — keep the toggle present so
              the toolbar reads complete vs the design. */}
          <span className="pi-view-btn" role="tab" aria-selected="false" aria-disabled="true">
            <span className="ic list" aria-hidden>
              <span /><span /><span />
            </span>
            {t('viewList')}
          </span>
        </div>

        <div className="pi-spacer" />

        {/* Status filter — server-side via query param. */}
        <form action="/company/projects" method="get" className="pi-filter">
          <select name="status" defaultValue={statusFilter} className="pi-filter-select">
            <option value="all">{t('filterStatusAll')}</option>
            <option value="active">{t('filterStatusActive')}</option>
            <option value="draft">{t('filterStatusDraft')}</option>
            <option value="archived">{t('filterStatusArchived')}</option>
          </select>
          <noscript>
            <button type="submit" className="pi-filter-apply">{t('apply')}</button>
          </noscript>
        </form>

        <Link href="/company/projects/new" className="pi-head-btn">
          <span aria-hidden>+</span> {t('addProject')}
        </Link>
      </div>

      {/* =============== Grid of cards =============== */}
      <div className="pi-grid">
        {visibleProjects.map((p) => {
          const isDraft = p.status === 'draft';
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
                    Math.floor((dateNow.getTime() - startDate.getTime()) / MS_PER_DAY / 7) + 1,
                  ),
                )
              : null;

          const rollup = tasksByProject.get(p.id) ?? { done: 0, total: 0 };
          const taskProgress =
            rollup.total > 0 ? Math.round((rollup.done / rollup.total) * 100) : 0;
          // Fall back to week-of-week progress when there are no tasks yet —
          // matches the dashboard tile's behaviour so the bar isn't always 0.
          const fallbackProgress =
            currentWeek && totalWeeks ? Math.round((currentWeek / totalWeeks) * 100) : 0;
          const progress = isDraft
            ? 0
            : rollup.total > 0
              ? taskProgress
              : fallbackProgress;

          const internshipCount = internshipCountByProject.get(p.id) ?? 0;
          const meta = isDraft
            ? t('cardMetaNotStarted', { n: internshipCount })
            : currentWeek && totalWeeks
              ? t('cardMetaWeekOf', {
                  current: currentWeek,
                  total: totalWeeks,
                  n: internshipCount,
                })
              : t('cardMetaNoClock', { n: internshipCount });

          return (
            <Link key={p.id} href={`/company/projects/${p.id}`} className={`pi-card${isDraft ? ' draft' : ''}`}>
              <div className="pi-card-top">
                <span className="pi-card-mark" style={{ background: color }} aria-hidden>
                  {code}
                </span>
                <span className="pi-card-title">{p.name}</span>
              </div>

              <div className="pi-card-meta">{meta}</div>

              <div className="pi-card-progress">
                <div className="row">
                  <span>{t('cardProgress')}</span>
                  <b>{progress}%</b>
                </div>
                <div className="bar">
                  <div
                    className={`fill${progress >= 50 ? ' cyan' : ''}`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>

              <div className="pi-card-foot">
                <span className="pi-card-tasks">
                  <span
                    className={`check${rollup.total > 0 && rollup.done === rollup.total ? ' done' : ''}`}
                    aria-hidden
                  />
                  <span>
                    <b>
                      {rollup.done}/{rollup.total}
                    </b>{' '}
                    {t('cardTasks')}
                  </span>
                </span>
                {(activeWsByProject.get(p.id) ?? 0) > 0 && (
                  <span className="pi-card-pill">
                    {t('cardActive', { n: activeWsByProject.get(p.id) ?? 0 })}
                  </span>
                )}
              </div>

              <span className={`pi-card-cta${isDraft ? ' draft' : ''}`} aria-hidden>
                {isDraft ? t('ctaContinueSetup') : t('ctaViewDetails')}
              </span>
            </Link>
          );
        })}

        {/* "+ New project" dashed CTA card — always last in the grid. */}
        <Link href="/company/projects/new" className="pi-card add" aria-label={t('newProject')}>
          <span className="plus-big" aria-hidden>+</span>
          <span>{t('newProject')}</span>
        </Link>
      </div>

      {visibleProjects.length === 0 && (
        <div className="pi-empty">
          <p>
            {statusFilter === 'archived'
              ? t('emptyArchived')
              : statusFilter === 'draft'
                ? t('emptyDrafts')
                : t('emptyAll')}
          </p>
        </div>
      )}

    </div>
  );
}
