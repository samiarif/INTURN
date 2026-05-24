import Link from 'next/link';

type Tab = { id: string; label: string; count?: string; href: string | null };

export function WorkspaceTabBar({
  tasksCount,
  deliverablesCount,
  activityNew,
  commentsNew,
  activeTab = 'overview',
  basePath,
}: {
  tasksCount: number;
  deliverablesCount: number;
  activityNew?: number;
  commentsNew?: number;
  activeTab?: string;
  // `basePath` is the workspace URL prefix, e.g. /intern/workspaces/<id> or
  // /company/workspaces/<id>. Tabs link relative to it.
  basePath: string;
}) {
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', href: basePath },
    { id: 'tasks', label: 'Tasks', count: String(tasksCount), href: `${basePath}/tasks` },
    { id: 'deliverables', label: 'Deliverables', count: String(deliverablesCount), href: `${basePath}/deliverables` },
    { id: 'timeline', label: 'Timeline', href: null },
    {
      id: 'activity',
      label: 'Activity',
      count: activityNew ? `${activityNew} new` : undefined,
      href: null,
    },
    {
      id: 'comments',
      label: 'Comments',
      count: commentsNew ? String(commentsNew) : undefined,
      href: null,
    },
  ];

  return (
    <div className="ws-mhead-tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const className = `ws-mhead-tab ${isActive ? 'active' : ''}`;
        const inner = (
          <>
            {tab.label}
            {tab.count && <span className="count">{tab.count}</span>}
          </>
        );
        if (tab.href && !isActive) {
          return (
            <Link key={tab.id} href={tab.href} className={className}>
              {inner}
            </Link>
          );
        }
        return (
          <span
            key={tab.id}
            className={className}
            aria-disabled={!tab.href}
            style={!tab.href && !isActive ? { cursor: 'not-allowed', opacity: 0.6 } : undefined}
          >
            {inner}
          </span>
        );
      })}
    </div>
  );
}
