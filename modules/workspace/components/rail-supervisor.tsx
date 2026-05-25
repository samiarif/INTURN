import type { WorkspaceOverviewData } from '../queries';
import { ScheduleCheckInButton } from './schedule-check-in';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function hoursAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
}

function formatHoursAgo(h: number): string {
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Build a sparkline path over the last N weeks of the internship using event
 * cumulative count. Width = 280, height = 36 (matches .ws-perf-spark).
 */
function buildSparkPath(events: WorkspaceOverviewData['events'], weeks: number): { area: string; line: string; tip: { x: number; y: number } } | null {
  if (events.length === 0) return null;
  const now = Date.now();
  const buckets = Array.from({ length: weeks }, () => 0);
  for (const e of events) {
    const ageDays = Math.floor((now - new Date(e.createdAt).getTime()) / MS_PER_DAY);
    const bucket = weeks - 1 - Math.floor(ageDays / 7);
    if (bucket >= 0 && bucket < weeks) buckets[bucket] += 1;
  }
  // Cumulative
  let total = 0;
  const cumulative = buckets.map((b) => (total += b));
  const max = Math.max(1, ...cumulative);
  const width = 280;
  const height = 36;
  const padTop = 4;
  const points = cumulative.map((c, i) => {
    const x = (i / (weeks - 1)) * width;
    const y = padTop + (height - padTop) * (1 - c / max);
    return { x, y };
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${width},${height} L 0,${height} Z`;
  return { area, line, tip: points[points.length - 1] };
}

export function RailSupervisor({ data }: { data: WorkspaceOverviewData }) {
  const intern = data.intern;
  const internName = intern?.firstName ?? 'the intern';

  // Performance: % of deliverables that have been submitted (proxy for on-time delivery).
  // Real "on-time" calc would need a deadline per deliverable — Sprint 5 work.
  const totalDelivs = data.deliverables.length;
  const submitted = data.deliverables.filter((d) =>
    ['submitted', 'approved', 'revision-requested'].includes(d.status ?? ''),
  ).length;
  const onTimePct = totalDelivs > 0 ? Math.round((submitted / totalDelivs) * 100) : 0;

  // Weeks elapsed in the internship for sparkline domain
  const weeksDomain = Math.max(2, data.internship?.duration ?? 12);
  const spark = buildSparkPath(data.events, weeksDomain);

  // "This week" — review-pending deliverables + tasks in review
  const pendingReviews = data.deliverables
    .filter((d) => d.status === 'submitted')
    .slice(0, 2);
  const tasksInReview = data.tasks.filter((t) => t.status === 'review').slice(0, 2);

  // Quiet flag: hours since last event by the intern
  const lastInternEvent = intern
    ? data.events.find((e) => e.actorId === intern.id)
    : null;
  const quietHours = lastInternEvent
    ? hoursAgo(new Date(lastInternEvent.createdAt))
    : null;
  const quietFlag = quietHours !== null && quietHours >= 24;

  // Today's date for the "This week · 30 May" eyebrow
  const today = new Date();
  const thisWeekLabel = `This week · ${today.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  })}`;

  return (
    <>
      <div className="ws-perf">
        <div className="ws-perf-head">
          <h4>Performance signal</h4>
          <span className="ws-perf-tag">DATA · LIVE</span>
        </div>
        <div className="ws-perf-metric">
          <b>
            {onTimePct}
            <span style={{ fontSize: 16, marginLeft: 2 }}>%</span>
          </b>
          <span className="delta">on-time delivery</span>
        </div>
        <div className="ws-perf-bench">
          {submitted} of {totalDelivs} sent · {data.events.length} events logged across the
          internship.
        </div>
        {spark && (
          <svg className="ws-perf-spark" viewBox="0 0 280 36" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#06B6D4" stopOpacity="0.35" />
                <stop offset="1" stopColor="#06B6D4" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={spark.area} fill="url(#sparkGrad)" />
            <path d={spark.line} fill="none" stroke="#06B6D4" strokeWidth="1.5" />
            <circle cx={spark.tip.x} cy={spark.tip.y} r="3" fill="#06B6D4" />
          </svg>
        )}
      </div>

      <div className="ws-rail-cta">
        <h4>Need a sync?</h4>
        <p>Schedule a check-in. Inturn generates the link and adds it to the timeline.</p>
        <ScheduleCheckInButton workspaceId={data.workspace.id} />
      </div>

      <div className="ws-rail-quick">
        <h4>{thisWeekLabel}</h4>
        <ul>
          {pendingReviews.length === 0 && tasksInReview.length === 0 ? (
            <li>
              <span className="dot" />
              Nothing waiting on you
            </li>
          ) : (
            <>
              {pendingReviews.map((d) => (
                <li key={d.id} className="urgent">
                  <span className="dot" />
                  Review {d.title}
                </li>
              ))}
              {tasksInReview.map((t) => (
                <li key={t.id} className="next">
                  <span className="dot" />
                  Annotate {t.title}
                </li>
              ))}
            </>
          )}
        </ul>
      </div>

      {quietFlag && quietHours !== null && (
        <div className="ws-note">
          <b>Quiet flag · informational</b>
          <br />
          No activity from {internName} in {formatHoursAgo(quietHours)}.{' '}
          <a className="ws-link" style={{ color: '#92400E', textDecoration: 'underline' }}>
            Send a nudge
          </a>
        </div>
      )}
    </>
  );
}
