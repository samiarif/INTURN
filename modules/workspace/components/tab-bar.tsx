'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export type TabId = 'overview' | 'tasks' | 'deliverables' | 'timeline' | 'activity' | 'comments' | 'check-in';
type Tab = { id: TabId; label: string; count?: string; enabled: boolean };

export function WorkspaceTabBar({
  tasksCount,
  deliverablesCount,
  activityNew,
  commentsNew,
}: {
  tasksCount: number;
  deliverablesCount: number;
  activityNew?: number;
  commentsNew?: number;
}) {
  const t = useTranslations('workspace.tabs');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeTab = (params.get('tab') ?? 'overview') as TabId;

  function setTab(tab: TabId) {
    const next = new URLSearchParams(params.toString());
    if (tab === 'overview') next.delete('tab');
    else next.set('tab', tab);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  const tabs: Tab[] = [
    { id: 'overview', label: t('overview'), enabled: true },
    { id: 'tasks', label: t('tasks'), count: String(tasksCount), enabled: true },
    { id: 'deliverables', label: t('deliverables'), count: String(deliverablesCount), enabled: true },
    { id: 'timeline', label: t('timeline'), enabled: true },
    { id: 'activity', label: t('activity'), count: activityNew ? `${activityNew} new` : undefined, enabled: false },
    { id: 'comments', label: t('comments'), count: commentsNew ? String(commentsNew) : undefined, enabled: true },
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
        if (!tab.enabled) {
          return (
            <span key={tab.id} className={className} aria-disabled style={{ cursor: 'not-allowed', opacity: 0.6 }}>
              {inner}
            </span>
          );
        }
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={className}
            aria-current={isActive ? 'page' : undefined}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
