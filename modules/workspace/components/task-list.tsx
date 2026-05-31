import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ListChecks, ArrowRight } from 'lucide-react';
import type { Task } from '@/db/schema';

const STATUS_LABEL_KEY: Record<string, 'todo' | 'inProgress' | 'review' | 'done'> = {
  todo: 'todo',
  'in-progress': 'inProgress',
  review: 'review',
  done: 'done',
};

const STATUS_PILL_CLASS: Record<string, string> = {
  todo: 'pill-todo',
  'in-progress': 'pill-prog',
  review: 'pill-review',
  done: 'pill-done',
};

type DueInfo = { label: string; urgent?: boolean };

// Translator for the relative-time labels. Both date branches reuse the shared
// `dueOn` ("Due {date}") with either a weekday or a month/day; the "done"
// branches and bare overdue label carry their own keys (plural-aware for weeks).
type DueT = (
  key: 'doneOn' | 'doneWeeksAgo' | 'overdueShort' | 'dueOn',
  vars?: { day?: string; weeks?: number; date?: string },
) => string;

function formatDue(
  task: Task,
  t: DueT,
  doneLabel: string,
  reviewLabel: string,
  locale: string,
): DueInfo {
  if (task.status === 'done') {
    // Design shows "Done · Mon" / "Done · 2wk ago" — derive from updatedAt.
    if (task.updatedAt) {
      const updated = new Date(task.updatedAt);
      const daysAgo = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        return { label: t('doneOn', { day: updated.toLocaleDateString(locale, { weekday: 'short' }) }) };
      }
      return { label: t('doneWeeksAgo', { weeks: Math.floor(daysAgo / 7) }) };
    }
    return { label: doneLabel };
  }
  if (task.status === 'review') return { label: reviewLabel };
  if (!task.dueDate) return { label: '—' };
  const due = new Date(task.dueDate);
  const now = new Date();
  const daysAway = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAway < 0) return { label: t('overdueShort'), urgent: true };
  if (daysAway <= 7) {
    return { label: t('dueOn', { date: due.toLocaleDateString(locale, { weekday: 'short' }) }), urgent: true };
  }
  return { label: t('dueOn', { date: due.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) }) };
}

export async function TaskList({
  tasks,
  view,
  basePath,
}: {
  tasks: Task[];
  view: 'intern' | 'supervisor';
  basePath: string;
}) {
  const [t, tCols, locale] = await Promise.all([
    getTranslations('workspace.tasksBoard'),
    getTranslations('workspace.tasksBoard.columns'),
    getLocale(),
  ]);
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <ListChecks size={16} strokeWidth={2.25} className="ws-hico" />
        <h3>{view === 'intern' ? t('thisWeek') : t('thisWeekSupervisor')}</h3>
        <Link href={`${basePath}?tab=tasks`} className="ws-link">{t('seeAll', { count: tasks.length })} <ArrowRight size={13} strokeWidth={2.25} aria-hidden /></Link>
      </div>
      <div className="ws-tasks">
        {tasks.map((task) => {
          const statusKey = task.status ?? 'todo';
          const labelKey = STATUS_LABEL_KEY[statusKey] ?? 'todo';
          const due = formatDue(task, t, tCols('done'), tCols('review'), locale);
          return (
            <div
              key={task.id}
              className={`ws-task ${statusKey === 'done' ? 'done' : ''} ${statusKey === 'review' ? 'review' : ''}`}
            >
              <span className="check" />
              <span className="ws-task-name">{task.title}</span>
              <span className="ws-task-tag">{task.tag ?? ''}</span>
              <span className={`pill ${STATUS_PILL_CLASS[statusKey] ?? 'pill-todo'}`}>
                <span className="dot" />
                {tCols(labelKey)}
              </span>
              <span className={`ws-task-due ${due.urgent ? 'urgent' : ''}`}>{due.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
