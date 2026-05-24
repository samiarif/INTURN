import type { WorkspaceOverviewData } from '../queries';

function daysFromNow(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function RailIntern({ data }: { data: WorkspaceOverviewData }) {
  // "This week" — items due in the next 7 days. Server component; Date.now()
  // runs once per request, which is exactly what we want.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const inAWeek = now + 7 * 86400_000;
  const tasksThisWeek = data.tasks
    .filter((t) => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate).getTime();
      return due >= now && due <= inAWeek;
    })
    .slice(0, 4);

  const deliverablesThisWeek = data.deliverables
    .filter((d) => d.status === 'draft')
    .slice(0, 2);

  const submittedDelivs = data.deliverables.filter((d) =>
    ['submitted', 'approved', 'revision-requested'].includes(d.status ?? ''),
  );
  const totalDelivs = data.deliverables.length;
  const eventCount = data.events.length; // approximate — "Full timeline →" gives the precise count
  const endDate = data.workspace.endDate ? new Date(data.workspace.endDate) : null;
  const endDateLabel = endDate
    ? endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <>
      <div className="ws-rail-cta">
        <h4>Weekly check-in</h4>
        <p>Due Friday. Inturn drafts it from your activity — you edit and send.</p>
        <button className="ws-btn-w">Draft check-in →</button>
      </div>

      <div className="ws-rail-quick">
        <h4>This week</h4>
        <ul>
          {tasksThisWeek.length === 0 && deliverablesThisWeek.length === 0 ? (
            <li>
              <span className="dot" />
              Nothing urgent this week
            </li>
          ) : (
            <>
              {tasksThisWeek.map((t) => {
                const daysAway = daysFromNow(t.dueDate);
                const urgent = daysAway !== null && daysAway <= 2;
                return (
                  <li key={t.id} className={urgent ? 'urgent' : 'next'}>
                    <span className="dot" />
                    {t.title} {t.dueDate && `(${fmtDayShort(new Date(t.dueDate))})`}
                  </li>
                );
              })}
              {deliverablesThisWeek.map((d) => (
                <li key={d.id}>
                  <span className="dot" />
                  Ship {d.title}
                </li>
              ))}
            </>
          )}
        </ul>
      </div>

      <div className="ws-rail-quick">
        <h4>Your record · so far</h4>
        <ul>
          <li>
            <span className="dot" style={{ background: 'var(--success)' }} />
            {submittedDelivs.length} of {totalDelivs} deliverables submitted
          </li>
          <li>
            <span className="dot" style={{ background: 'var(--brand-500)' }} />
            {eventCount} events logged this internship
          </li>
          <li>
            <span className="dot" style={{ background: 'var(--ink-4)' }} />
            End-of-internship record · {endDateLabel}
          </li>
        </ul>
      </div>
    </>
  );
}
