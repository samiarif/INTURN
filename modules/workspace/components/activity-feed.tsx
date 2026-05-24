import type { Event } from '@/db/schema';

export type ActorLookup = Map<string, { firstName: string | null; lastName: string | null }>;

const BULLET_BY_TYPE: Record<string, string> = {
  'deliverable.submitted': 'deliv',
  'deliverable.approved': 'system',
  'deliverable.revision.requested': 'deliv',
  'comment.added': 'comment',
  'task.moved': 'task',
  'system.checkin.scheduled': 'system',
  'checkin.submitted': 'system',
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

function actorName(actorId: string | null, actors: ActorLookup): string {
  if (!actorId) return 'Someone';
  const a = actors.get(actorId);
  if (!a) return 'Someone';
  return a.firstName ?? a.lastName ?? 'Someone';
}

function describe(event: Event, actors: ActorLookup): React.ReactNode {
  const meta = (event.metadata ?? {}) as Record<string, unknown>;
  const who = actorName(event.actorId, actors);
  switch (event.type) {
    case 'deliverable.submitted': {
      const v = meta.version ? ` (v${String(meta.version)})` : '';
      return (
        <>
          <b>{who}</b> submitted <b>{String(meta.name ?? 'a deliverable')}</b>
          {v}
        </>
      );
    }
    case 'deliverable.approved':
      return (
        <>
          <b>{who}</b> approved <b>{String(meta.name ?? 'a deliverable')}</b>
        </>
      );
    case 'deliverable.revision.requested':
      return (
        <>
          <b>{who}</b> requested changes on <b>{String(meta.name ?? 'a deliverable')}</b>
          {meta.note ? ` — "${String(meta.note)}"` : ''}
        </>
      );
    case 'comment.added': {
      const scopeLabel =
        meta.scope === 'task'
          ? 'a task'
          : meta.scope === 'deliverable'
            ? 'a deliverable'
            : 'the workspace';
      return (
        <>
          <b>{who}</b> commented on <b>{scopeLabel}</b>
          {meta.text ? ` — "${String(meta.text)}"` : ''}
        </>
      );
    }
    case 'task.moved':
      return (
        <>
          <b>{who}</b> moved <span className="tag">{String(meta.tag ?? '')}</span> to{' '}
          <b>{String(meta.to ?? '')}</b>
        </>
      );
    case 'system.checkin.scheduled': {
      const when = meta.scheduledAt
        ? new Date(String(meta.scheduledAt)).toLocaleString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })
        : meta.for
          ? String(meta.for)
          : '';
      return (
        <>
          <b>{who}</b> scheduled a check-in {when ? `for ${when}` : ''}
        </>
      );
    }
    case 'checkin.submitted':
      return (
        <>
          <b>{who}</b> sent the weekly check-in
        </>
      );
    default:
      return <span>{event.type}</span>;
  }
}

export function ActivityFeed({ events, actors }: { events: Event[]; actors: ActorLookup }) {
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
              <span className="ws-act-text">{describe(e, actors)}</span>
              <span className="ws-act-time">{timeAgo(new Date(e.createdAt))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
