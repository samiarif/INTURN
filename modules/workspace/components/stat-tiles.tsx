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

export function StatTiles({
  data,
  view,
}: {
  data: WorkspaceOverviewData;
  view: 'intern' | 'supervisor';
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
        <div className="ws-stat-foot good">
          {view === 'intern'
            ? latestSubmitted
              ? `✓ ${latestSubmitted.title.slice(0, 28)}`
              : 'Nothing submitted yet'
            : pendingReview > 0
              ? `${pendingReview} pending review`
              : 'Nothing pending'}
        </div>
      </div>
      <div className="ws-stat">
        <div className="ws-stat-label">Days remaining</div>
        <div className="ws-stat-value">
          <b>{daysRemaining}</b>
          <small>days</small>
        </div>
        <div className="ws-stat-foot">
          {endDate
            ? `Ends ${endDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`
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
          <span className="arrow-up">↗</span>{' '}
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
