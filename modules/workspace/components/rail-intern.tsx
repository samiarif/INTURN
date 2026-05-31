import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDateShort, type FormatLocale } from '@/lib/format-time';
import type { WorkspaceOverviewData } from '../queries';

function daysFromNow(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtDayShort(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'short' });
}

export async function RailIntern({ data }: { data: WorkspaceOverviewData }) {
  const locale = (await getLocale()) as FormatLocale;
  const t = await getTranslations('workspace.rail');
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
  const endDateLabel = endDate ? formatDateShort(endDate, locale) : t('emptyDash');

  // Today's date for the "This week · 30 May" eyebrow
  const today = new Date();
  const thisWeekLabel = t('thisWeekLabel', { date: formatDateShort(today, locale) });

  return (
    <>
      <div className="ws-rail-cta">
        <h4>{t('checkInTitle')}</h4>
        <p>{t('checkInBody')}</p>
        <Link
          href={`/intern/workspaces/${data.workspace.id}?tab=check-in`}
          className="ws-btn-w"
          style={{ textDecoration: 'none' }}
        >
          {t('draftCheckIn')}
        </Link>
      </div>

      <div className="ws-rail-quick">
        <h4>{thisWeekLabel}</h4>
        <ul>
          {tasksThisWeek.length === 0 && deliverablesThisWeek.length === 0 ? (
            <li>
              <span className="dot" />
              {t('nothingUrgent')}
            </li>
          ) : (
            <>
              {tasksThisWeek.map((task) => {
                const daysAway = daysFromNow(task.dueDate);
                const urgent = daysAway !== null && daysAway <= 2;
                return (
                  <li key={task.id} className={urgent ? 'urgent' : 'next'}>
                    <span className="dot" />
                    {task.dueDate
                      ? t('taskWithDay', { title: task.title, day: fmtDayShort(new Date(task.dueDate), locale) })
                      : task.title}
                  </li>
                );
              })}
              {deliverablesThisWeek.map((d) => (
                <li key={d.id}>
                  <span className="dot" />
                  {t('shipDeliverable', { title: d.title })}
                </li>
              ))}
            </>
          )}
        </ul>
      </div>

      <div className="ws-rail-quick">
        <h4>{t('recordTitle')}</h4>
        <ul>
          <li>
            <span className="dot" style={{ background: 'var(--success)' }} />
            {t('deliverablesSubmitted', { submitted: submittedDelivs.length, total: totalDelivs })}
          </li>
          <li>
            <span className="dot" style={{ background: 'var(--brand)' }} />
            {t('eventsLogged', { count: eventCount })}
          </li>
          <li>
            <span className="dot" style={{ background: 'var(--ink-4)' }} />
            {t('endOfInternshipRecord', { date: endDateLabel })}
          </li>
        </ul>
      </div>
    </>
  );
}
