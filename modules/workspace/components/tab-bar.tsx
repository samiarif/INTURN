type Tab = { id: string; label: string; count?: string; active?: boolean };

export function WorkspaceTabBar({
  tasksCount,
  deliverablesCount,
  activityNew,
  commentsNew,
  activeTab = 'overview',
}: {
  tasksCount: number;
  deliverablesCount: number;
  activityNew?: number;
  commentsNew?: number;
  activeTab?: string;
}) {
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks', count: String(tasksCount) },
    { id: 'deliverables', label: 'Deliverables', count: String(deliverablesCount) },
    { id: 'timeline', label: 'Timeline' },
    { id: 'activity', label: 'Activity', count: activityNew ? `${activityNew} new` : undefined },
    { id: 'comments', label: 'Comments', count: commentsNew ? String(commentsNew) : undefined },
  ];

  return (
    <div className="ws-mhead-tabs">
      {tabs.map((tab) => (
        <span
          key={tab.id}
          className={`ws-mhead-tab ${tab.id === activeTab ? 'active' : ''}`}
          aria-disabled={tab.id !== activeTab}
          style={tab.id !== activeTab ? { cursor: 'not-allowed' } : undefined}
        >
          {tab.label}
          {tab.count && <span className="count">{tab.count}</span>}
        </span>
      ))}
    </div>
  );
}
