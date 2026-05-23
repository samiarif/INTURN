import type { WorkspaceOverviewData } from '../queries';
import { computeDaysRemaining } from '../queries';

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

  const endDate = data.workspace.endDate ? new Date(data.workspace.endDate) : null;
  const daysRemaining = computeDaysRemaining(endDate);

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
          {view === 'intern' ? '✓ Latest submitted · v2' : '✓ Pending review'}
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
        <div className="ws-stat-label">{view === 'intern' ? 'Hours this week' : 'Activity score'}</div>
        <div className="ws-stat-value">
          <b>{view === 'intern' ? '18.5' : '92'}</b>
          <small>{view === 'intern' ? 'hrs' : '/ 100'}</small>
        </div>
        <div className="ws-stat-foot good">
          <span className="arrow-up">↗</span>{' '}
          {view === 'intern' ? '+2.5 vs last wk' : 'Above the floor of 70'}
        </div>
      </div>
    </div>
  );
}
