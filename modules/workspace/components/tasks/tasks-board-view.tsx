'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task } from '@/db/schema';
import { TASK_COLUMNS, type TaskStatus } from '@/modules/tasks/state-machine';
import { moveTaskAction } from '@/modules/tasks/server-actions';
import {
  parseFilterParam,
  sortTasks,
  filterTasks,
  derivePhasesFromTasks,
  type SortKey,
} from '@/modules/workspace/utils/task-view-state';
import { TaskColumn } from './task-column';
import { formatDue, type DueInfo } from './task-card';
import { AddTaskModal } from '../add-task-modal';
import { TaskToolbar } from './task-toolbar';

type TaskWithMeta = Task & { needsReview?: boolean; comments?: number; attachments?: number };

export type TasksBoardViewProps = {
  tasks: TaskWithMeta[];
  view: 'intern' | 'supervisor';
  internName: string;
  workspaceId: string;
  enableListAndCalendar?: boolean;
};

const COLUMN_LABEL_KEY: Record<TaskStatus, 'todo' | 'inProgress' | 'review' | 'done'> = {
  todo: 'todo',
  'in-progress': 'inProgress',
  review: 'review',
  done: 'done',
};

export function TasksBoardView({
  tasks,
  view,
  internName,
  workspaceId,
  enableListAndCalendar = false,
}: TasksBoardViewProps) {
  const t = useTranslations('workspace.tasksBoard');
  const tCols = useTranslations('workspace.tasksBoard.columns');
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});
  const [addingForColumn, setAddingForColumn] = useState<TaskStatus | null>(null);

  const filter = parseFilterParam(params.get('filter'));
  const sortKey = (params.get('sort') ?? 'due') as SortKey;
  const group = params.get('group') ?? 'status';
  const filtered = useMemo(() => filterTasks(tasks, filter), [tasks, filter]);
  const sorted = useMemo(() => sortTasks(filtered, sortKey), [filtered, sortKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function renderDue(d: DueInfo): string {
    switch (d.kind) {
      case 'closed':   return t('closed');
      case 'review':   return t('awaitingReview');
      case 'none':     return '—';
      case 'overdue':  return t('overdue', { days: d.days });
      case 'dueSoon':  return d.days === 0 ? t('dueToday') : `${d.weekday} · ${t('dueIn', { days: d.days })}`;
      case 'dueLater': return t('dueOn', { date: d.date });
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
    if (!over) { setOverColumn(null); return; }
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
    const task = sorted.find((tk) => tk.id === taskId);
    if (!task) return;
    const overData = over.data.current as { columnId?: TaskStatus } | undefined;
    const fromIdPrefix = typeof over.id === 'string' && over.id.startsWith('column-')
      ? (over.id.slice('column-'.length) as TaskStatus)
      : null;
    const toStatus: TaskStatus | null = overData?.columnId ?? fromIdPrefix;
    if (!toStatus) return;
    if (statusOf(task) === toStatus) return;
    setOptimistic((m) => ({ ...m, [taskId]: toStatus }));
    startTransition(async () => {
      try {
        await moveTaskAction({ taskId, to: toStatus });
        router.refresh();
      } catch {
        setOptimistic((m) => { const next = { ...m }; delete next[taskId]; return next; });
      }
    });
  }
  function onDragCancel() {
    setActiveColumn(null);
    setOverColumn(null);
  }

  const columns = useMemo(() => {
    if (group === 'phase') {
      const phases = derivePhasesFromTasks(sorted);
      const phaseLike = phases.map((p) => ({ status: p as TaskStatus, label: p, cls: 'phase' }));
      return [...phaseLike, { status: '__none__' as TaskStatus, label: t('noPhase'), cls: 'phase' }];
    }
    return TASK_COLUMNS.map((c) => ({ status: c.status, label: tCols(COLUMN_LABEL_KEY[c.status]), cls: c.cls }));
  }, [group, sorted, t, tCols]);

  function tasksForColumn(colStatus: string): TaskWithMeta[] {
    if (group === 'phase') {
      if (colStatus === '__none__') {
        return sorted.filter((tk) => !tk.tag || !tk.tag.includes('-'));
      }
      return sorted.filter((tk) => tk.tag?.startsWith(`${colStatus}-`));
    }
    return sorted.filter((tk) => statusOf(tk) === colStatus);
  }

  return (
    <div className="ws-col-main" style={{ gap: 0 }}>
      <TaskToolbar tasks={tasks} enableListAndCalendar={enableListAndCalendar} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className={`tb-board ${pending ? 'opacity-90' : ''}`}>
          {columns.map((col) => {
            const colTasks = tasksForColumn(col.status);
            return (
              <TaskColumn
                key={String(col.status)}
                status={col.status as TaskStatus}
                cls={col.cls}
                label={col.label}
                tasks={colTasks}
                view={view}
                internName={internName}
                isOver={overColumn === col.status && activeColumn !== col.status}
                renderDue={renderDue}
                addTaskLabel={t('addTask')}
                emptyDropLabel={t('emptyDrop')}
                onAddClick={() => setAddingForColumn(col.status as TaskStatus)}
              />
            );
          })}
        </div>
      </DndContext>
      {addingForColumn && (
        <AddTaskModal
          workspaceId={workspaceId}
          initialStatus={addingForColumn}
          onClose={() => setAddingForColumn(null)}
        />
      )}
    </div>
  );
}
