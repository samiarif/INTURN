import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ListChecks } from 'lucide-react';
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

function formatDue(
  task: Task,
  labels: { done: string; review: string; overdue: string },
  locale: string,
): DueInfo {
  if (task.status === 'done') {
    // Design shows "Done · Mon" / "Done · 2wk ago" — try to derive from updatedAt
    if (task.updatedAt) {
      const updated = new Date(task.updatedAt);
      const daysAgo = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        return {
          label: `${labels.done} · ${updated.toLocaleDateString(locale, { weekday: 'short' })}`,
        };
      }
      const weeksAgo = Math.floor(daysAgo / 7);
      if (weeksAgo === 1) return { label: `${labels.done} · 1wk ago` };
      return { label: `${labels.done} · ${weeksAgo}wk ago` };
    }
    return { label: labels.done };
  }
  if (task.status === 'review') return { label: labels.review };
  if (!task.dueDate) return { label: '—' };
  const due = new Date(task.dueDate);
  const now = new Date();
  const daysAway = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAway < 0) return { label: labels.overdue, urgent: true };
  if (daysAway <= 7) {
    const day = due.toLocaleDateString(locale, { weekday: 'short' });
    return { label: `Due ${day}`, urgent: true };
  }
  return { label: `Due ${due.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}` };
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
  // Strings "Tasks · this week", "See all N →", and the bare "Overdue"
  // (no days suffix) are not in the plan namespace and remain English.
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <ListChecks size={16} strokeWidth={2.25} className="ws-hico" />
        <h3>{view === 'intern' ? t('thisWeek') : 'Tasks · this week'}</h3>
        <Link href={`${basePath}?tab=tasks`} className="ws-link">See all {tasks.length} →</Link>
      </div>
      <div className="ws-tasks">
        {tasks.map((task) => {
          const statusKey = task.status ?? 'todo';
          const labelKey = STATUS_LABEL_KEY[statusKey] ?? 'todo';
          const due = formatDue(task, {
            done: tCols('done'),
            review: tCols('review'),
            overdue: 'Overdue',
          }, locale);
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
