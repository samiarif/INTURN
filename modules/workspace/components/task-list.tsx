import { getTranslations } from 'next-intl/server';
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
): DueInfo {
  if (task.status === 'done') return { label: labels.done };
  if (task.status === 'review') return { label: labels.review };
  if (!task.dueDate) return { label: '—' };
  const due = new Date(task.dueDate);
  const now = new Date();
  const daysAway = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAway < 0) return { label: labels.overdue, urgent: true };
  if (daysAway <= 7) {
    const day = due.toLocaleDateString(undefined, { weekday: 'short' });
    return { label: `Due ${day}`, urgent: true };
  }
  return { label: `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` };
}

export async function TaskList({
  tasks,
  view,
}: {
  tasks: Task[];
  view: 'intern' | 'supervisor';
}) {
  const t = await getTranslations('workspace.tasksBoard');
  const tCols = await getTranslations('workspace.tasksBoard.columns');
  // Strings "Tasks · this week", "See all N →", and the bare "Overdue"
  // (no days suffix) are not in the plan namespace and remain English.
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>{view === 'intern' ? t('thisWeek') : 'Tasks · this week'}</h3>
        <a className="ws-link">See all {tasks.length} →</a>
      </div>
      <div className="ws-tasks">
        {tasks.map((task) => {
          const statusKey = task.status ?? 'todo';
          const labelKey = STATUS_LABEL_KEY[statusKey] ?? 'todo';
          const due = formatDue(task, {
            done: tCols('done'),
            review: tCols('review'),
            overdue: 'Overdue',
          });
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
