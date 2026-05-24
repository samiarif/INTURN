'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Task } from '@/db/schema';
import { TASK_COLUMNS, type TaskStatus } from '@/modules/tasks/state-machine';
import { moveTaskAction } from '@/modules/tasks/server-actions';

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

function formatDue(task: Task): { text: string; urgent: boolean; overdue: boolean } {
  if (task.status === 'done') return { text: 'Closed', urgent: false, overdue: false };
  if (task.status === 'review') return { text: 'Awaiting review', urgent: false, overdue: false };
  if (!task.dueDate) return { text: '—', urgent: false, overdue: false };
  const due = new Date(task.dueDate);
  const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `Overdue ${-days}d`, urgent: true, overdue: true };
  if (days <= 3) {
    const weekday = due.toLocaleDateString('en-US', { weekday: 'short' });
    return { text: `Due ${weekday} · in ${days}d`, urgent: true, overdue: false };
  }
  return {
    text: `Due ${due.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});

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
          Due this week{' '}
          <span className="num">
            {
              tasks.filter((t) => {
                if (!t.dueDate || t.status === 'done') return false;
                const days = (new Date(t.dueDate).getTime() - Date.now()) / 86400_000;
                return days >= 0 && days <= 7;
              }).length
            }
          </span>
        </div>
        <div className="tb-spacer" />
        <div className="tb-chip">
          Sort: Due date<span className="caret" />
        </div>
      </div>

      <div className={`tb-board ${pending ? 'opacity-90' : ''}`}>
        {TASK_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => statusOf(t) === col.status);
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
                <span className="name">{col.label}</span>
                <span className="count">{colTasks.length}</span>
                <button className="menu" aria-label="Column menu" type="button">
                  ⋯
                </button>
              </div>
              <div className="tb-col-list">
                {colTasks.map((t) => {
                  const due = formatDue(t);
                  const label = deriveLabel(t.tag);
                  const showNeedsReview =
                    view === 'supervisor' && statusOf(t) === 'review';
                  const cardClass = [
                    'tb-card',
                    due.urgent && 'urgent',
                    due.overdue && 'overdue',
                    showNeedsReview && 'needs-review',
                    statusOf(t) === 'done' && 'done',
                    draggingId === t.id && 'opacity-50',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <div
                      key={t.id}
                      id={`task-${t.id}`}
                      className={cardClass}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      onDragEnd={onDragEnd}
                    >
                      <div className="tb-card-top">
                        {t.tag && <span className="tb-card-tag">{t.tag}</span>}
                        {label && (
                          <span className={`tb-card-label ${label.kind}`}>{label.text}</span>
                        )}
                        <button className="tb-card-menu" aria-label="More" type="button">
                          ⋯
                        </button>
                      </div>
                      <div className="tb-card-title">{t.title}</div>
                      {t.description && (
                        <div className="tb-card-sub">{t.description}</div>
                      )}
                      <div className="tb-card-foot">
                        <span
                          className={`tb-card-due ${due.urgent ? 'urgent' : ''} ${due.overdue ? 'overdue' : ''} ${statusOf(t) === 'done' ? 'good' : ''}`}
                        >
                          <span className="cal" />
                          <span>{due.text}</span>
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
                  <span>Add task</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
