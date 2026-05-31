import { getLocale, getTranslations } from 'next-intl/server';
import { Activity, ArrowRight } from 'lucide-react';
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

function timeAgo(
  date: Date,
  t: (key: 'minutesAgo' | 'hoursAgo' | 'daysAgo', vars?: { n: number }) => string,
): string {
  const ms = Date.now() - date.getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  return t('daysAgo', { n: days });
}

export async function ActivityFeed({
  events,
  actors,
}: {
  events: Event[];
  actors: ActorLookup;
}) {
  const [t, locale] = await Promise.all([
    getTranslations('workspace.activity'),
    getLocale(),
  ]);

  // Bold chunks for the rich per-event sentences. The verbs, scope words,
  // and word order are translator-controlled via `workspace.activity.event.*`
  // — this is the unified event-activity humanizer (replaces the old English
  // describe()). Names, deliverable titles, and tags stay verbatim (data).
  const bold = (chunks: React.ReactNode) => <b>{chunks}</b>;

  function actorName(actorId: string | null): string {
    if (!actorId) return t('someone');
    const a = actors.get(actorId);
    if (!a) return t('someone');
    return a.firstName ?? a.lastName ?? t('someone');
  }

  function describe(event: Event): React.ReactNode {
    const meta = (event.metadata ?? {}) as Record<string, unknown>;
    const who = actorName(event.actorId);
    switch (event.type) {
      case 'deliverable.submitted': {
        const version = meta.version ? ` (v${String(meta.version)})` : '';
        return t.rich('event.submitted', {
          b: bold,
          who,
          name: String(meta.name ?? t('aDeliverable')),
          version,
        });
      }
      case 'deliverable.approved':
        return t.rich('event.approved', {
          b: bold,
          who,
          name: String(meta.name ?? t('aDeliverable')),
        });
      case 'deliverable.revision.requested':
        return (
          <>
            {t.rich('event.revisionRequested', {
              b: bold,
              who,
              name: String(meta.name ?? t('aDeliverable')),
            })}
            {meta.note ? t('event.note', { text: String(meta.note) }) : ''}
          </>
        );
      case 'comment.added': {
        const scope =
          meta.scope === 'task'
            ? t('scope.task')
            : meta.scope === 'deliverable'
              ? t('scope.deliverable')
              : t('scope.workspace');
        return (
          <>
            {t.rich('event.commented', { b: bold, who, scope })}
            {meta.text ? t('event.note', { text: String(meta.text) }) : ''}
          </>
        );
      }
      case 'task.moved':
        return t.rich('event.taskMoved', {
          b: bold,
          tag: (chunks) => <span className="tag">{chunks}</span>,
          who,
          tagText: String(meta.tag ?? ''),
          to: String(meta.to ?? ''),
        });
      case 'system.checkin.scheduled': {
        const when = meta.scheduledAt
          ? new Date(String(meta.scheduledAt)).toLocaleString(locale, {
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
            {t.rich('event.checkinScheduled', { b: bold, who })}
            {when ? t('event.checkinFor', { when }) : ''}
          </>
        );
      }
      case 'checkin.submitted':
        return t.rich('event.checkinSubmitted', { b: bold, who });
      default:
        return <span>{event.type}</span>;
    }
  }

  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <Activity size={16} strokeWidth={2.25} className="ws-hico" />
        <h3>{t('recentTitle')}</h3>
        <a className="ws-link">{t('fullTimeline')} <ArrowRight size={13} strokeWidth={2.25} aria-hidden /></a>
      </div>
      <div className="ws-activity">
        {events.length === 0 ? (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, padding: 12 }}>{t('empty')}</p>
        ) : (
          events.map((e) => {
            const bullet = BULLET_BY_TYPE[e.type] ?? 'system';
            return (
              <div className="ws-act" key={e.id}>
                <span className={`ws-act-bullet ${bullet}`}>
                  <i />
                </span>
                <span className="ws-act-text">{describe(e)}</span>
                <span className="ws-act-time">{timeAgo(new Date(e.createdAt), t)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
