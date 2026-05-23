import type { Event } from '@/db/schema';

const BULLET_BY_TYPE: Record<string, string> = {
  'deliverable.submitted': 'deliv',
  'deliverable.revision.requested': 'deliv',
  'comment.added': 'comment',
  'task.moved': 'task',
  'system.checkin.scheduled': 'system',
  'stuck.signaled': 'stuck',
};

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function describe(event: Event): React.ReactNode {
  const meta = (event.metadata ?? {}) as Record<string, unknown>;
  switch (event.type) {
    case 'deliverable.submitted':
      return (
        <>
          <b>Yasmine</b> submitted <b>{String(meta.name ?? 'a deliverable')}</b>
        </>
      );
    case 'deliverable.revision.requested':
      return (
        <>
          <b>Mehdi</b> requested changes on <b>{String(meta.name ?? 'a deliverable')}</b>
          {meta.note ? ` — "${String(meta.note)}"` : ''}
        </>
      );
    case 'comment.added':
      return (
        <>
          <b>Mehdi</b> commented on <b>{String(meta.task ?? 'a task')}</b>
          {meta.text ? ` — "${String(meta.text)}"` : ''}
        </>
      );
    case 'task.moved':
      return (
        <>
          <b>Yasmine</b> moved <span className="tag">{String(meta.tag ?? '')}</span> to{' '}
          <b>{String(meta.to ?? '')}</b>
        </>
      );
    case 'system.checkin.scheduled':
      return (
        <>
          Weekly check-in <b>scheduled</b> for {String(meta.for ?? '')}
        </>
      );
    default:
      return <span>{event.type}</span>;
  }
}

export function ActivityFeed({ events }: { events: Event[] }) {
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>Recent activity</h3>
        <a className="ws-link">Full timeline →</a>
      </div>
      <div className="ws-activity">
        {events.map((e) => {
          const bullet = BULLET_BY_TYPE[e.type] ?? 'system';
          return (
            <div className="ws-act" key={e.id}>
              <span className={`ws-act-bullet ${bullet}`}>
                <i />
              </span>
              <span className="ws-act-text">{describe(e)}</span>
              <span className="ws-act-time">{timeAgo(new Date(e.createdAt))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
