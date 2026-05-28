import { TrendingUp } from 'lucide-react';
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

export function StatTiles({
  data,
  view,
  locale,
}: {
  data: WorkspaceOverviewData;
  view: 'intern' | 'supervisor';
  locale: string;
}) {
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
      ? `✓ ${truncate(latestSubmitted.title, 22)} · v${latestSubmitted.version} sent`
      : pendingReview > 0
        ? `${pendingReview} pending review`
        : `✓ ${truncate(latestSubmitted.title, 22)} reviewed`
    : view === 'intern'
      ? 'Nothing submitted yet'
      : 'Nothing pending';

  return (
    <div className="ws-stats">
      <div className="ws-stat">
        <div className="ws-stat-label">Tasks</div>
        <div className="ws-stat-value">
          <b>{openTasks}</b>
          <small>of {tasks.length} open</small>
        </div>
        <div className="ws-stat-foot">
          {doneTasks} done · {inReviewTasks} in review
        </div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Deliverables</div>
        <div className="ws-stat-value">
          <b>{submitted.length}</b>
          <small>of {deliverables.length} submitted</small>
        </div>
        <div className={`ws-stat-foot ${latestSubmitted ? 'good' : ''}`}>{delivFoot}</div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Days remaining</div>
        <div className="ws-stat-value">
          <b>{daysRemaining}</b>
          <small>days</small>
        </div>
        <div className="ws-stat-foot">
          {endDate
            ? `Ends ${endDate.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}`
            : '—'}
        </div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">
          {view === 'intern' ? 'Events this week' : 'Activity score'}
        </div>
        <div className="ws-stat-value">
          <b>{view === 'intern' ? eventsThisWeek : activityScore}</b>
          <small>{view === 'intern' ? 'logged' : '/ 100'}</small>
        </div>
        <div className="ws-stat-foot good">
          <TrendingUp size={12} strokeWidth={2.25} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} />{' '}
          {view === 'intern'
            ? `${data.events.length} total this internship`
            : activityScore >= 70
              ? 'Above the floor of 70'
              : 'Below floor — flag for nudge'}
        </div>
      </div>
    </div>
  );
}
