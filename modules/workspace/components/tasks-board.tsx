'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Task } from '@/db/schema';
import { TASK_COLUMNS, type TaskStatus } from '@/modules/tasks/state-machine';
import { moveTaskAction } from '@/modules/tasks/server-actions';

const COLUMN_LABEL_KEY: Record<TaskStatus, 'todo' | 'inProgress' | 'review' | 'done'> = {
  todo: 'todo',
  'in-progress': 'inProgress',
  review: 'review',
  done: 'done',
};

type TaskWithMeta = Task & {
  needsReview?: boolean;
  comments?: number;
  attachments?: number;
};

const LABELS_BY_TAG_PREFIX: Record<string, { kind: string; text: string }> = {
  BA: { kind: 'design', text: 'Design' },
  UX: { kind: 'research', text: 'Research' },
};

function deriveLabel(tag: string | null): { kind: string; text: string } | null {
  if (!tag) return null;
  const prefix = tag.split('-')[0];
  return LABELS_BY_TAG_PREFIX[prefix] ?? null;
}

type DueInfo =
  | { kind: 'closed'; urgent: false; overdue: false }
  | { kind: 'review'; urgent: false; overdue: false }
  | { kind: 'none'; urgent: false; overdue: false }
  | { kind: 'overdue'; days: number; urgent: true; overdue: true }
  | { kind: 'dueSoon'; days: number; weekday: string; urgent: true; overdue: false }
  | { kind: 'dueLater'; date: string; urgent: false; overdue: false };

function formatDue(task: Task): DueInfo {
  if (task.status === 'done') return { kind: 'closed', urgent: false, overdue: false };
  if (task.status === 'review') return { kind: 'review', urgent: false, overdue: false };
  if (!task.dueDate) return { kind: 'none', urgent: false, overdue: false };
  const due = new Date(task.dueDate);
  const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { kind: 'overdue', days: -days, urgent: true, overdue: true };
  if (days <= 3) {
    const weekday = due.toLocaleDateString('en-US', { weekday: 'short' });
    return { kind: 'dueSoon', days, weekday, urgent: true, overdue: false };
  }
  return {
    kind: 'dueLater',
    date: due.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    urgent: false,
    overdue: false,
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function TasksBoard({
  tasks,
  view,
  internName,
}: {
  tasks: TaskWithMeta[];
  view: 'intern' | 'supervisor';
  internName: string;
}) {
  const t = useTranslations('workspace.tasksBoard');
  const tCols = useTranslations('workspace.tasksBoard.columns');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});

  // Render translated due text. Not every kind is in the plan namespace; the
  // remaining kinds keep their English source until the namespace expands.
  function renderDue(d: DueInfo): string {
    switch (d.kind) {
      case 'closed':
        return 'Closed';
      case 'review':
        return 'Awaiting review';
      case 'none':
        return '—';
      case 'overdue':
        return t('overdue', { days: d.days });
      case 'dueSoon':
        return d.days === 0
          ? t('dueToday')
          : `${d.weekday} · ${t('dueIn', { days: d.days })}`;
      case 'dueLater':
        return `Due ${d.date}`;
    }
  }

  function statusOf(task: TaskWithMeta): TaskStatus {
    return (optimistic[task.id] ?? task.status ?? 'todo') as TaskStatus;
  }

  function onDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDraggingId(taskId);
  }

  function onDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  }

  function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverCol(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (statusOf(task) === status) return;
    setOptimistic((m) => ({ ...m, [taskId]: status }));
    startTransition(async () => {
      try {
        await moveTaskAction({ taskId, to: status });
        router.refresh();
      } catch {
        // Revert on failure
        setOptimistic((m) => {
          const next = { ...m };
          delete next[taskId];
          return next;
        });
      }
    });
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOverCol(null);
  }

  const needsReviewCount = tasks.filter((t) => statusOf(t) === 'review').length;
  const firstReviewTask = tasks.find((t) => statusOf(t) === 'review');

  // Date.now is read once per render to bucket due dates. Lint flags Date.now
  // as impure; intentional here — we want fresh values across renders.
  // eslint-disable-next-line react-hooks/purity
  const renderTime = Date.now();
  const dueThisWeekCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'done') return false;
    const days = (new Date(t.dueDate).getTime() - renderTime) / 86400_000;
    return days >= 0 && days <= 7;
  }).length;
  // useMemo lint silence (the import is still useful if we add more memos later)
  void useMemo;

  return (
    <div className="ws-col-main" style={{ gap: 0 }}>
      {view === 'supervisor' && needsReviewCount > 0 && firstReviewTask && (
        <div className="tb-review-banner">
          <span className="dot" />
          <span>
            <b>
              {needsReviewCount} task{needsReviewCount === 1 ? ' is' : 's are'} waiting on you.
            </b>{' '}
            {internName} submitted{' '}
            <b>
              {firstReviewTask.tag ? `${firstReviewTask.tag} · ` : ''}
              {firstReviewTask.title}
            </b>
            .
          </span>
          <a className="nav" href={`#task-${firstReviewTask.id}`}>
            JUMP TO CARD →
          </a>
        </div>
      )}

      <div className="tb-toolbar">
        <div className="tb-view">
          <button className="active" type="button">
            Board
          </button>
          <button type="button" disabled>
            List
          </button>
          <button type="button" disabled>
            Calendar
          </button>
        </div>
        <div className="tb-chip active">
          All <span className="num">{tasks.length}</span>
        </div>
        <div className="tb-chip">
          {view === 'supervisor' ? `Assigned to ${internName.split(' ')[0]}` : 'Mine'}{' '}
          <span className="num">{tasks.length}</span>
        </div>
        <div className="tb-chip">
          Due this week <span className="num">{dueThisWeekCount}</span>
        </div>
        <div className="tb-spacer" />
        <div className="tb-chip">
          Sort: Due date<span className="caret" />
        </div>
      </div>

      <div className={`tb-board ${pending ? 'opacity-90' : ''}`}>
        {TASK_COLUMNS.map((col) => {
          const colTasks = tasks.filter((task) => statusOf(task) === col.status);
          return (
            <div
              key={col.status}
              className={`tb-col ${col.cls} ${dragOverCol === col.status ? 'tb-col-over' : ''}`}
              onDragOver={(e) => onDragOver(e, col.status)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => onDrop(e, col.status)}
            >
              <div className="tb-col-head">
                <span className="pip" />
                <span className="name">{tCols(COLUMN_LABEL_KEY[col.status])}</span>
                <span className="count">{colTasks.length}</span>
                <button className="menu" aria-label="Column menu" type="button">
                  ⋯
                </button>
              </div>
              <div className="tb-col-list">
                {colTasks.map((task) => {
                  const due = formatDue(task);
                  const label = deriveLabel(task.tag);
                  const showNeedsReview =
                    view === 'supervisor' && statusOf(task) === 'review';
                  const cardClass = [
                    'tb-card',
                    due.urgent && 'urgent',
                    due.overdue && 'overdue',
                    showNeedsReview && 'needs-review',
                    statusOf(task) === 'done' && 'done',
                    draggingId === task.id && 'opacity-50',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <div
                      key={task.id}
                      id={`task-${task.id}`}
                      className={cardClass}
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onDragEnd={onDragEnd}
                    >
                      <div className="tb-card-top">
                        {task.tag && <span className="tb-card-tag">{task.tag}</span>}
                        {label && (
                          <span className={`tb-card-label ${label.kind}`}>{label.text}</span>
                        )}
                        <button className="tb-card-menu" aria-label="More" type="button">
                          ⋯
                        </button>
                      </div>
                      <div className="tb-card-title">{task.title}</div>
                      {task.description && (
                        <div className="tb-card-sub">{task.description}</div>
                      )}
                      <div className="tb-card-foot">
                        <span
                          className={`tb-card-due ${due.urgent ? 'urgent' : ''} ${due.overdue ? 'overdue' : ''} ${statusOf(task) === 'done' ? 'good' : ''}`}
                        >
                          <span className="cal" />
                          <span>{renderDue(due)}</span>
                        </span>
                        <div className="tb-meta-chips" />
                        <span
                          className="ws-avatar xs who"
                          title={internName}
                          style={{ background: 'linear-gradient(135deg,#DDD6FE,#C7D2FE)', color: 'var(--brand-600)' }}
                        >
                          {initials(internName)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="tb-card-ghost">Drop here to move</div>
                )}
              </div>
              {view === 'supervisor' && (
                <button className="tb-col-add" type="button">
                  <span className="plus">+</span>
                  <span>{t('addTask')}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
