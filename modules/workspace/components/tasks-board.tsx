'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/db/schema';
import { TASK_COLUMNS, type TaskStatus } from '@/modules/tasks/state-machine';
import { moveTaskAction } from '@/modules/tasks/server-actions';
import { Avatar } from '@/components/avatar';
import { AddTaskModal } from './add-task-modal';

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

type CardProps = {
  task: TaskWithMeta;
  status: TaskStatus;
  view: 'intern' | 'supervisor';
  internName: string;
  renderDue: (d: DueInfo) => string;
};

// Each card is sortable within its column. The hook returns drag attributes,
// listeners, and transform/transition CSS we apply to the wrapper. `data` lets
// onDragEnd recover the source column without a lookup.
function SortableTaskCard({ task, status, view, internName, renderDue }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { columnId: status } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // While dragging, dim the original card (visual cue without DragOverlay).
    opacity: isDragging ? 0.5 : undefined,
  };

  const due = formatDue(task);
  const label = deriveLabel(task.tag);
  const showNeedsReview = view === 'supervisor' && status === 'review';
  const cardClass = [
    'tb-card',
    due.urgent && 'urgent',
    due.overdue && 'overdue',
    showNeedsReview && 'needs-review',
    status === 'done' && 'done',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      id={`task-${task.id}`}
      className={cardClass}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable task"
    >
      <div className="tb-card-top">
        {task.tag && <span className="tb-card-tag">{task.tag}</span>}
        {label && <span className={`tb-card-label ${label.kind}`}>{label.text}</span>}
        <button
          className="tb-card-menu"
          aria-label="More"
          type="button"
          // Stop drag listeners from swallowing the click.
          onPointerDown={(e) => e.stopPropagation()}
        >
          ⋯
        </button>
      </div>
      <div className="tb-card-title">{task.title}</div>
      {task.description && <div className="tb-card-sub">{task.description}</div>}
      <div className="tb-card-foot">
        <span
          className={`tb-card-due ${due.urgent ? 'urgent' : ''} ${due.overdue ? 'overdue' : ''} ${status === 'done' ? 'good' : ''}`}
        >
          {status === 'done' ? <span className="ico-check" /> : <span className="cal" />}
          <span>{renderDue(due)}</span>
        </span>
        <Avatar name={internName} size="xs" title={internName} />
      </div>
    </div>
  );
}

type ColumnProps = {
  status: TaskStatus;
  cls: string;
  label: string;
  tasks: TaskWithMeta[];
  view: 'intern' | 'supervisor';
  internName: string;
  isOver: boolean;
  renderDue: (d: DueInfo) => string;
  addTaskLabel: string;
  emptyDropLabel: string;
  onAddClick: () => void;
};

// A droppable wrapper exposes the column to @dnd-kit so empty columns are valid
// drop targets. The SortableContext handles cards within. `data.columnId` is
// how onDragEnd recovers the destination status when dropping on the column
// itself (vs. on another card).
function BoardColumn({
  status,
  cls,
  label,
  tasks,
  view,
  internName,
  isOver,
  renderDue,
  addTaskLabel,
  emptyDropLabel,
  onAddClick,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: `column-${status}`, data: { columnId: status } });
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`tb-col ${cls} ${isOver ? 'tb-col-over' : ''}`}
      data-column-status={status}
    >
      <div className="tb-col-head">
        <span className="pip" aria-hidden="true" />
        <span className="name">{label}</span>
        <span className="count" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
        <button className="menu" aria-label={`${label} column menu`} type="button">
          ⋯
        </button>
      </div>
      <div className="tb-col-list">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              status={status}
              view={view}
              internName={internName}
              renderDue={renderDue}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && <div className="tb-card-ghost">{emptyDropLabel}</div>}
      </div>
      {view === 'supervisor' && (
        <button className="tb-col-add" type="button" onClick={onAddClick}>
          <span className="plus">+</span>
          <span>{addTaskLabel}</span>
        </button>
      )}
    </div>
  );
}

export function TasksBoard({
  tasks,
  view,
  internName,
  workspaceId,
}: {
  tasks: TaskWithMeta[];
  view: 'intern' | 'supervisor';
  internName: string;
  workspaceId: string;
}) {
  const t = useTranslations('workspace.tasksBoard');
  const tCols = useTranslations('workspace.tasksBoard.columns');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});
  const [addingForColumn, setAddingForColumn] = useState<TaskStatus | null>(null);

  // PointerSensor with 8px distance threshold keeps clicks/taps from being
  // mistaken for drags. KeyboardSensor enables Tab/Space/arrow-key DnD.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { columnId?: TaskStatus } | undefined;
    setActiveColumn(data?.columnId ?? null);
    setOverColumn(data?.columnId ?? null);
  }

  function onDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }
    const overData = over.data.current as { columnId?: TaskStatus } | undefined;
    let to: TaskStatus | null = overData?.columnId ?? null;
    if (!to && typeof over.id === 'string' && over.id.startsWith('column-')) {
      to = over.id.slice('column-'.length) as TaskStatus;
    }
    setOverColumn(to);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setOverColumn(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;

    // `over` may be a card or a column droppable. Both carry `columnId` in
    // their data; fall back to parsing the id for the `column-*` form.
    const overData = over.data.current as { columnId?: TaskStatus } | undefined;
    const fromIdPrefix =
      typeof over.id === 'string' && over.id.startsWith('column-')
        ? (over.id.slice('column-'.length) as TaskStatus)
        : null;
    const toStatus: TaskStatus | null = overData?.columnId ?? fromIdPrefix;
    if (!toStatus) return;

    if (statusOf(task) === toStatus) return;

    const target: TaskStatus = toStatus;
    setOptimistic((m) => ({ ...m, [taskId]: target }));
    startTransition(async () => {
      try {
        await moveTaskAction({ taskId, to: target });
        router.refresh();
      } catch {
        setOptimistic((m) => {
          const next = { ...m };
          delete next[taskId];
          return next;
        });
      }
    });
  }

  function onDragCancel() {
    setActiveColumn(null);
    setOverColumn(null);
  }

  const needsReviewCount = tasks.filter((task) => statusOf(task) === 'review').length;
  const firstReviewTask = tasks.find((task) => statusOf(task) === 'review');

  // Date.now is read once per render to bucket due dates. Lint flags Date.now
  // as impure; intentional here — we want fresh values across renders.
  // eslint-disable-next-line react-hooks/purity
  const renderTime = Date.now();
  const dueThisWeekCount = tasks.filter((task) => {
    if (!task.dueDate || task.status === 'done') return false;
    const days = (new Date(task.dueDate).getTime() - renderTime) / 86400_000;
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="ws-col-main" style={{ gap: 0 }}>
      {view === 'supervisor' && needsReviewCount > 0 && firstReviewTask && (
        <div className="tb-review-banner">
          <span className="dot" />
          <span>
            <b>{t('reviewBannerHeadline', { count: needsReviewCount })}</b>{' '}
            {t('reviewBannerBodyPrefix', { name: internName })}{' '}
            <b>
              {firstReviewTask.tag ? `${firstReviewTask.tag} · ` : ''}
              {firstReviewTask.title}
            </b>
            .
          </span>
          <a className="nav" href={`#task-${firstReviewTask.id}`}>
            {t('reviewBannerJump')}
          </a>
        </div>
      )}

      <div className="tb-toolbar">
        <div className="tb-view">
          <button className="active" type="button">
            {t('viewBoard')}
          </button>
          <button type="button" disabled>
            {t('viewList')}
          </button>
          <button type="button" disabled>
            {t('viewCalendar')}
          </button>
        </div>
        <div className="tb-chip active">
          {t('filterAll')} <span className="num">{tasks.length}</span>
        </div>
        <div className="tb-chip">
          {view === 'supervisor'
            ? t('filterAssignedTo', { name: internName.split(' ')[0] })
            : t('filterMine')}{' '}
          <span className="num">{tasks.length}</span>
        </div>
        <div className="tb-chip">
          {t('filterPhase')}
          <span className="caret" />
        </div>
        <div className="tb-chip">
          {t('filterDueThisWeek')} <span className="num">{dueThisWeekCount}</span>
        </div>
        <div className="tb-spacer" />
        <div className="tb-chip">
          {t('sortDueDate')}
          <span className="caret" />
        </div>
        <div className="tb-chip">
          {t('groupStatus')}
          <span className="caret" />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              'To pick up a task, press space or enter. Use the arrow keys to move the task between columns. Press space or enter again to drop the task, or press escape to cancel.',
          },
          announcements: {
            onDragStart: ({ active }) => `Picked up task ${String(active.id)}.`,
            onDragOver: ({ active, over }) =>
              over ? `Task ${String(active.id)} is over ${String(over.id)}.` : `Task ${String(active.id)} is no longer over a droppable area.`,
            onDragEnd: ({ active, over }) =>
              over
                ? `Task ${String(active.id)} was dropped over ${String(over.id)}.`
                : `Task ${String(active.id)} was dropped.`,
            onDragCancel: ({ active }) => `Dragging task ${String(active.id)} was cancelled.`,
          },
        }}
      >
        <div className={`tb-board ${pending ? 'opacity-90' : ''}`}>
          {TASK_COLUMNS.map((col) => {
            const colTasks = tasks.filter((task) => statusOf(task) === col.status);
            return (
              <BoardColumn
                key={col.status}
                status={col.status}
                cls={col.cls}
                label={tCols(COLUMN_LABEL_KEY[col.status])}
                tasks={colTasks}
                view={view}
                internName={internName}
                isOver={overColumn === col.status && activeColumn !== col.status}
                renderDue={renderDue}
                addTaskLabel={t('addTask')}
                emptyDropLabel={t('emptyDrop')}
                onAddClick={() => setAddingForColumn(col.status)}
              />
            );
          })}
        </div>
      </DndContext>
      {view === 'supervisor' && addingForColumn && (
        <AddTaskModal
          workspaceId={workspaceId}
          initialStatus={addingForColumn}
          onClose={() => setAddingForColumn(null)}
        />
      )}
    </div>
  );
}
