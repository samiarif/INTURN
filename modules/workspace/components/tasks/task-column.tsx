'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '@/db/schema';
import type { TaskStatus } from '@/modules/tasks/state-machine';
import { SortableTaskCard, type DueInfo } from './task-card';
import { TaskColumnMenu } from './task-column-menu';

type TaskWithMeta = Task & {
  needsReview?: boolean;
  comments?: number;
  attachments?: number;
};

export type TaskColumnProps = {
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

export function TaskColumn({
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
}: TaskColumnProps) {
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
        <TaskColumnMenu status={status} onAddClick={onAddClick} />
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
      <button className="tb-col-add" type="button" onClick={onAddClick}>
        <span className="plus">+</span>
        <span>{addTaskLabel}</span>
      </button>
    </div>
  );
}
