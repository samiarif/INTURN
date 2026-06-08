import { getTranslations } from 'next-intl/server';
import { WorkspaceMHead } from './m-head';
import { TasksViewsShell } from './tasks/tasks-views-shell';
import { TasksBoardView } from './tasks/tasks-board-view';
import { SprintBanner, type SprintForBanner } from './sprint-banner';
import type { WorkspaceOverviewData } from '../queries';
import type { WorkspaceTasksSprintData } from '../page-data';
import type { WorkspaceView } from '../types';
import type { Task } from '@/db/schema';

export async function WorkspaceTasksPage({
  data,
  view,
  sprintData,
  sprintParam,
}: {
  data: WorkspaceOverviewData;
  view: WorkspaceView;
  // basePath retained in callers for API symmetry; unused since the
  // workspace consolidated to a single route with ?tab= switching.
  basePath?: string;
  // Sprint context for the Tasks tab only. When omitted or when the project has
  // no sprints, the page renders exactly as it did before sprints existed.
  sprintData?: WorkspaceTasksSprintData;
  // Raw `?sprint=` query value (server-side). Drives which sprint subset renders.
  sprintParam?: string;
}) {
  const internName =
    `${data.intern?.firstName ?? ''} ${data.intern?.lastName ?? ''}`.trim() || 'the intern';

  // ──────────────────────────────────────────────────────────────────────────
  // Regression-safe path: no sprint plan → render the original Tasks page tree,
  // unchanged. (Everything below the `return` is byte-identical to the pre-sprint
  // implementation.) Keeps a 0-sprint workspace pixel-for-pixel as it was.
  // ──────────────────────────────────────────────────────────────────────────
  if (!sprintData || sprintData.sprints.length === 0) {
    return (
      <>
        <WorkspaceMHead
          view={view}
          workspaceId={data.workspace.id}
          internFirstName={data.intern?.firstName ?? null}
          internLastName={data.intern?.lastName ?? null}
          internshipTitle={data.internship?.title ?? ''}
          startDate={data.workspace.startDate ? new Date(data.workspace.startDate) : null}
          endDate={data.workspace.endDate ? new Date(data.workspace.endDate) : null}
          taskCount={data.tasks.length}
          deliverableCount={data.deliverables.length}
        />
        <div
          className="ws-content"
          style={{ gridTemplateColumns: '1fr', paddingTop: 20, paddingBottom: 40 }}
        >
          <TasksViewsShell
            tasks={data.tasks}
            view={view}
            internName={internName}
            workspaceId={data.workspace.id}
          />
        </div>
      </>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Sprint-aware path. sprints.length > 0 here, so activeIndex is non-null.
  // ──────────────────────────────────────────────────────────────────────────
  const tasksContentStyle = { gridTemplateColumns: '1fr', paddingTop: 20, paddingBottom: 40 };
  const { sprints, activeIndex, taskCountsBySprint } = sprintData;
  const t = await getTranslations('sprintWorkspace');

  // `?sprint=` → selectedKey. Missing resolves to the active sprint.
  const selectedKey = sprintParam ?? '__default__';

  const bannerSprints: SprintForBanner[] = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    goal: s.goal,
    orderIndex: s.orderIndex,
    startDate: s.startDate,
    endDate: s.endDate,
  }));

  const unsortedCount = data.tasks.filter((tk) => !tk.sprintId).length;

  // S{orderIndex+1} chip label per sprint, localized so no raw string reaches
  // JSX (satisfies i18next/no-literal-string). Only built — and only passed to
  // the cards — on the sprint-aware path.
  const sprintBadgeBySprintId = new Map<string, string>(
    sprints.map((s) => [s.id, t('sprintBadge', { n: s.orderIndex + 1 })]),
  );

  const banner = (
    <SprintBanner
      sprints={bannerSprints}
      activeIndex={activeIndex}
      selectedKey={selectedKey}
      unsortedCount={unsortedCount}
      taskCountsBySprint={taskCountsBySprint}
    />
  );

  const head = (
    <WorkspaceMHead
      view={view}
      workspaceId={data.workspace.id}
      internFirstName={data.intern?.firstName ?? null}
      internLastName={data.intern?.lastName ?? null}
      internshipTitle={data.internship?.title ?? ''}
      startDate={data.workspace.startDate ? new Date(data.workspace.startDate) : null}
      endDate={data.workspace.endDate ? new Date(data.workspace.endDate) : null}
      taskCount={data.tasks.length}
      deliverableCount={data.deliverables.length}
    />
  );

  // ── All view: a section per sprint (in order) + a trailing Unsorted section. ──
  if (selectedKey === 'all') {
    const bySprint = new Map<string, Task[]>();
    const unsorted: Task[] = [];
    for (const tk of data.tasks) {
      if (tk.sprintId) {
        const arr = bySprint.get(tk.sprintId) ?? [];
        arr.push(tk);
        bySprint.set(tk.sprintId, arr);
      } else {
        unsorted.push(tk);
      }
    }
    return (
      <>
        {head}
        <div
          className="ws-content"
          style={tasksContentStyle}
        >
          {banner}
          {sprints.map((s) => (
            <section key={s.id} style={{ marginBottom: 28 }}>
              <SprintSectionHeader
                eyebrow={t('sprintOf', { current: s.orderIndex + 1, total: sprints.length })}
                title={s.name}
              />
              <TasksBoardView
                tasks={bySprint.get(s.id) ?? []}
                view={view}
                internName={internName}
                workspaceId={data.workspace.id}
                sprintBadgeBySprintId={sprintBadgeBySprintId}
                hideToolbar
              />
            </section>
          ))}
          {unsortedCount > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SprintSectionHeader eyebrow={null} title={t('unsortedTitle')} />
              <TasksBoardView
                tasks={unsorted}
                view={view}
                internName={internName}
                workspaceId={data.workspace.id}
                sprintBadgeBySprintId={sprintBadgeBySprintId}
                hideToolbar
              />
            </section>
          )}
        </div>
      </>
    );
  }

  // ── Filtered view: a single sprint, or Unsorted. ──
  let filteredTasks: Task[];
  if (selectedKey === 'unsorted') {
    filteredTasks = data.tasks.filter((tk) => !tk.sprintId);
  } else {
    // '__default__' resolves to the active sprint's id; activeIndex is non-null
    // here because sprints.length > 0.
    const selectedSprintId =
      selectedKey === '__default__'
        ? (activeIndex != null ? sprints[activeIndex]?.id : undefined)
        : selectedKey;
    filteredTasks = data.tasks.filter((tk) => !!selectedSprintId && tk.sprintId === selectedSprintId);
  }

  return (
    <>
      {head}
      <div
        className="ws-content"
        style={tasksContentStyle}
      >
        {banner}
        <TasksViewsShell
          tasks={filteredTasks}
          view={view}
          internName={internName}
          workspaceId={data.workspace.id}
          sprintBadgeBySprintId={sprintBadgeBySprintId}
        />
      </div>
    </>
  );
}

function SprintSectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string | null;
  title: string;
}) {
  return (
    <header className="ws-sprint-section-header">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h3>{title}</h3>
    </header>
  );
}
