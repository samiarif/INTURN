import type { WorkspaceOverviewData } from '../queries';
import { WorkspaceTabBar } from './tab-bar';

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start || !end) return '';
  const fmt = (d: Date) =>
    d
      .toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      .toUpperCase()
      .replace(/\s/g, ' ');
  return `${fmt(start)} — ${fmt(end)}`;
}

export function WorkspaceMHead({
  data,
  view,
  basePath,
  activeTab = 'overview',
}: {
  data: WorkspaceOverviewData;
  view: 'intern' | 'supervisor';
  basePath: string;
  activeTab?: 'overview' | 'tasks' | 'deliverables' | 'timeline' | 'activity' | 'comments';
}) {
  const intern = data.intern;
  const title =
    view === 'intern'
      ? `Welcome back, ${intern?.firstName ?? ''}`
      : `${intern?.firstName ?? ''} ${intern?.lastName ?? ''} · ${data.internship?.title?.split('—')[0]?.trim() ?? ''}`;

  const start = data.workspace.startDate ? new Date(data.workspace.startDate) : null;
  const end = data.workspace.endDate ? new Date(data.workspace.endDate) : null;
  const range = formatDateRange(start, end);

  const taskCount = data.tasks.length;
  const deliverableCount = data.deliverables.length;

  return (
    <div className="ws-mhead">
      <div className="ws-mhead-title-row">
        <h1 className="ws-mhead-title">{title}</h1>
        <span className="ws-mhead-badge live">● ACTIVE</span>
        {range && (
          <span className="ws-mhead-badge mono" style={{ fontFamily: 'var(--font-mono)' }}>
            {range}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {view === 'intern' ? (
            <>
              <button className="ws-btn ghost tiny">Weekly check-in →</button>
              <button className="ws-btn brand tiny">
                <span className="plus">+</span> Add note
              </button>
            </>
          ) : (
            <>
              <button className="ws-btn ghost tiny">Schedule check-in</button>
              <button className="ws-btn brand tiny">
                <span className="plus">+</span> Assign task
              </button>
            </>
          )}
        </div>
      </div>
      <WorkspaceTabBar
        tasksCount={taskCount}
        deliverablesCount={deliverableCount}
        activityNew={view === 'supervisor' ? 3 : undefined}
        commentsNew={view === 'supervisor' ? 1 : undefined}
        activeTab={activeTab}
        basePath={basePath}
      />
    </div>
  );
}
