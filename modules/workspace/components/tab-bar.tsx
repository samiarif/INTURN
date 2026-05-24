import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

type TabId = 'overview' | 'tasks' | 'deliverables' | 'timeline' | 'activity' | 'comments';
type Tab = { id: TabId; label: string; count?: string; href: string | null };

export async function WorkspaceTabBar({
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
  const t = await getTranslations('workspace.tabs');
  const tabs: Tab[] = [
    { id: 'overview', label: t('overview'), href: basePath },
    { id: 'tasks', label: t('tasks'), count: String(tasksCount), href: `${basePath}/tasks` },
    { id: 'deliverables', label: t('deliverables'), count: String(deliverablesCount), href: `${basePath}/deliverables` },
    { id: 'timeline', label: t('timeline'), href: `${basePath}/timeline` },
    {
      id: 'activity',
      label: t('activity'),
      count: activityNew ? `${activityNew} new` : undefined,
      href: null,
    },
    {
      id: 'comments',
      label: t('comments'),
      count: commentsNew ? String(commentsNew) : undefined,
      href: `${basePath}/comments`,
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
