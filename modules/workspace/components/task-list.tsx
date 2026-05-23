import type { Task } from '@/db/schema';

const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  review: 'In review',
  done: 'Done',
};

const STATUS_PILL_CLASS: Record<string, string> = {
  todo: 'pill-todo',
  'in-progress': 'pill-prog',
  review: 'pill-review',
  done: 'pill-done',
};

function formatDue(task: Task): { label: string; urgent?: boolean } {
  if (task.status === 'done') return { label: 'Done' };
  if (task.status === 'review') return { label: 'In review' };
  if (!task.dueDate) return { label: '—' };
  const due = new Date(task.dueDate);
  const now = new Date();
  const daysAway = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAway < 0) return { label: 'Overdue', urgent: true };
  if (daysAway <= 7) {
    const day = due.toLocaleDateString(undefined, { weekday: 'short' });
    return { label: `Due ${day}`, urgent: true };
  }
  return { label: `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` };
}

function extractTag(task: Task): string {
  const match = task.description?.match(/External tag:\s*(\S+)/);
  return match?.[1] ?? '';
}

export function TaskList({
  tasks,
  view,
}: {
  tasks: Task[];
  view: 'intern' | 'supervisor';
}) {
  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3>{view === 'intern' ? "This week's tasks" : 'Tasks · this week'}</h3>
        <a className="ws-link">See all {tasks.length} →</a>
      </div>
      <div className="ws-tasks">
        {tasks.map((t) => {
          const due = formatDue(t);
          const tag = extractTag(t);
          const statusKey = t.status ?? 'todo';
          return (
            <div
              key={t.id}
              className={`ws-task ${statusKey === 'done' ? 'done' : ''} ${statusKey === 'review' ? 'review' : ''}`}
            >
              <span className="check" />
              <span className="ws-task-name">{t.title}</span>
              <span className="ws-task-tag">{tag}</span>
              <span className={`pill ${STATUS_PILL_CLASS[statusKey] ?? 'pill-todo'}`}>
                <span className="dot" />
                {STATUS_LABELS[statusKey] ?? statusKey}
              </span>
              <span className={`ws-task-due ${due.urgent ? 'urgent' : ''}`}>{due.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
