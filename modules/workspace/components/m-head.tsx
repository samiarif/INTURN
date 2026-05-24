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
  view,
  basePath,
  activeTab = 'overview',
  internFirstName,
  internLastName,
  internshipTitle,
  startDate,
  endDate,
  taskCount,
  deliverableCount,
}: {
  view: 'intern' | 'supervisor';
  basePath: string;
  activeTab?: 'overview' | 'tasks' | 'deliverables' | 'timeline' | 'activity' | 'comments';
  internFirstName: string | null;
  internLastName: string | null;
  internshipTitle: string;
  startDate: Date | null;
  endDate: Date | null;
  taskCount: number;
  deliverableCount: number;
}) {
  const title =
    view === 'intern'
      ? `Welcome back, ${internFirstName ?? ''}`
      : `${internFirstName ?? ''} ${internLastName ?? ''} · ${internshipTitle.split('—')[0]?.trim() ?? ''}`;

  const range = formatDateRange(startDate, endDate);

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
