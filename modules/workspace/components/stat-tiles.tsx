import { TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { WorkspaceOverviewData } from '../queries';
import { computeDaysRemaining } from '../queries';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function computeEventsThisWeek(events: WorkspaceOverviewData['events']): number {
  const weekAgo = Date.now() - 7 * MS_PER_DAY;
  return events.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
}

function computeActivityScore(events: WorkspaceOverviewData['events']): number {
  // Composite: events / week × 5, capped at 100. Tunable as we get cohort data.
  const recentCount = computeEventsThisWeek(events);
  return Math.min(100, recentCount * 12);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function StatTiles({
  data,
  view,
  locale,
}: {
  data: WorkspaceOverviewData;
  view: 'intern' | 'supervisor';
  locale: string;
}) {
  const t = await getTranslations('workspace.statTiles');
  const tasks = data.tasks;
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const inReviewTasks = tasks.filter((t) => t.status === 'review').length;

  const deliverables = data.deliverables;
  const submitted = deliverables.filter((d) =>
    ['submitted', 'approved', 'revision-requested'].includes(d.status ?? ''),
  );
  const pendingReview = deliverables.filter((d) => d.status === 'submitted').length;
  const latestSubmitted = submitted[0]; // already ordered by query

  const endDate = data.workspace.endDate ? new Date(data.workspace.endDate) : null;
  const daysRemaining = computeDaysRemaining(endDate);

  const eventsThisWeek = computeEventsThisWeek(data.events);
  const activityScore = computeActivityScore(data.events);

  // Deliverable footer: design shows `✓ Brand audit · v2 sent` (intern) or
  // `Brand audit · 1 pending review` (supervisor). Fall back gracefully.
  const delivFoot = latestSubmitted
    ? view === 'intern'
      ? t('delivSent', { title: truncate(latestSubmitted.title, 22), version: latestSubmitted.version ?? 1 })
      : pendingReview > 0
        ? t('delivPendingReview', { count: pendingReview })
        : t('delivReviewed', { title: truncate(latestSubmitted.title, 22) })
    : view === 'intern'
      ? t('delivNothingSubmitted')
      : t('delivNothingPending');

  return (
    <div className="ws-stats">
      <div className="ws-stat">
        <div className="ws-stat-label">{t('tasksLabel')}</div>
        <div className="ws-stat-value">
          <b>{openTasks}</b>
          <small>{t('ofOpen', { total: tasks.length })}</small>
        </div>
        <div className="ws-stat-foot">
          {t('tasksFoot', { done: doneTasks, review: inReviewTasks })}
        </div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">{t('deliverablesLabel')}</div>
        <div className="ws-stat-value">
          <b>{submitted.length}</b>
          <small>{t('ofSubmitted', { total: deliverables.length })}</small>
        </div>
        <div className={`ws-stat-foot ${latestSubmitted ? 'good' : ''}`}>{delivFoot}</div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">{t('daysRemainingLabel')}</div>
        <div className="ws-stat-value">
          <b>{daysRemaining}</b>
          <small>{t('daysUnit')}</small>
        </div>
        <div className="ws-stat-foot">
          {endDate
            ? t('endsOn', { date: endDate.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }) })
            : t('emptyDash')}
        </div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">
          {view === 'intern' ? t('eventsThisWeekLabel') : t('activityScoreLabel')}
        </div>
        <div className="ws-stat-value">
          <b>{view === 'intern' ? eventsThisWeek : activityScore}</b>
          <small>{view === 'intern' ? t('eventsUnit') : t('scoreUnit')}</small>
        </div>
        <div className="ws-stat-foot good">
          <TrendingUp size={12} strokeWidth={2.25} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} />{' '}
          {view === 'intern'
            ? t('eventsTotal', { count: data.events.length })
            : activityScore >= 70
              ? t('aboveFloor')
              : t('belowFloor')}
        </div>
      </div>
    </div>
  );
}
