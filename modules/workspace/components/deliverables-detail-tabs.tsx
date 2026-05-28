'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CommentsThread } from './comments-thread';
import type { CommentWithAuthor } from '@/modules/comments/queries';

type SubTab = 'versions' | 'brief' | 'comments' | 'activity';

/**
 * Client-side sub-tab switcher for the deliverable detail panel.
 *
 * The Versions / Brief / Activity panels are static markup built by the
 * server component and handed down as ReactNode props — the only interactive
 * panel is Comments, which renders the already-client CommentsThread with
 * deliverable-scoped data. Tab state is local: these are sub-tabs inside an
 * already-loaded panel, so URL state would be overkill.
 */
export function DelivDetailTabs({
  versionsCount,
  commentsCount,
  versions,
  brief,
  activity,
  comments,
  workspaceId,
  deliverableId,
  currentUserId,
  commentsPlaceholder,
  commentsEmpty,
}: {
  versionsCount: number;
  commentsCount: number;
  versions: React.ReactNode;
  brief: React.ReactNode;
  activity: React.ReactNode;
  comments: CommentWithAuthor[];
  workspaceId: string;
  deliverableId: string;
  currentUserId: string;
  commentsPlaceholder: string;
  commentsEmpty: string;
}) {
  const t = useTranslations('workspace.deliverables.master');
  const [active, setActive] = useState<SubTab>('versions');

  const tabs: Array<{ id: SubTab; label: string; count?: number }> = [
    { id: 'versions', label: t('versionsTab'), count: versionsCount },
    { id: 'brief', label: t('briefTab') },
    { id: 'comments', label: t('commentsTab'), count: commentsCount },
    { id: 'activity', label: t('activityTab') },
  ];

  return (
    <>
      <div className="dv-detail-tabs" role="tablist" aria-label={t('listTitle')}>
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`dv-tab-${tab.id}-${deliverableId}`}
              aria-selected={selected}
              aria-controls={`dv-panel-${tab.id}-${deliverableId}`}
              tabIndex={selected ? 0 : -1}
              className={`dv-detail-tab ${selected ? 'active' : ''}`}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
              {tab.count !== undefined && <span className="count">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`dv-panel-versions-${deliverableId}`}
        aria-labelledby={`dv-tab-versions-${deliverableId}`}
        hidden={active !== 'versions'}
      >
        {active === 'versions' && versions}
      </div>

      <div
        role="tabpanel"
        id={`dv-panel-brief-${deliverableId}`}
        aria-labelledby={`dv-tab-brief-${deliverableId}`}
        hidden={active !== 'brief'}
      >
        {active === 'brief' && brief}
      </div>

      <div
        role="tabpanel"
        id={`dv-panel-comments-${deliverableId}`}
        aria-labelledby={`dv-tab-comments-${deliverableId}`}
        hidden={active !== 'comments'}
      >
        {active === 'comments' && (
          <div className="dv-body">
            <CommentsThread
              workspaceId={workspaceId}
              deliverableId={deliverableId}
              comments={comments}
              currentUserId={currentUserId}
              placeholder={commentsPlaceholder}
              emptyMessage={commentsEmpty}
            />
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={`dv-panel-activity-${deliverableId}`}
        aria-labelledby={`dv-tab-activity-${deliverableId}`}
        hidden={active !== 'activity'}
      >
        {active === 'activity' && activity}
      </div>
    </>
  );
}
