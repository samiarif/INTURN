'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Task } from '@/db/schema';
import {
  parseFilterParam,
  filterTasks,
  sortTasks,
  type SortKey,
} from '@/modules/workspace/utils/task-view-state';
import { TasksBoardView } from './tasks-board-view';
import type { SprintOption } from './task-card-menu';

const TasksListView = dynamic(() =>
  import('./tasks-list-view').then((m) => ({ default: m.TasksListView })),
);
const TasksCalendarView = dynamic(() =>
  import('./tasks-calendar-view').then((m) => ({ default: m.TasksCalendarView })),
);

type Props = {
  tasks: Task[];
  view: 'intern' | 'supervisor';
  internName: string;
  workspaceId: string;
  /** sprintId → "S{n}" chip label. Present only on the sprint-aware Tasks path. */
  sprintBadgeBySprintId?: Map<string, string>;
  /** Sprint options for the move-to-sprint menu. Present only on the sprint-aware path. */
  sprintOptions?: SprintOption[];
};

export function TasksViewsShell({
  tasks,
  view,
  internName,
  workspaceId,
  sprintBadgeBySprintId,
  sprintOptions,
}: Props) {
  const params = useSearchParams();
  const which = params.get('view') ?? 'board';
  const filter = parseFilterParam(params.get('filter'));
  const sortKey = (params.get('sort') ?? 'due') as SortKey;

  const prepared = useMemo(() => sortTasks(filterTasks(tasks, filter), sortKey), [tasks, filter, sortKey]);

  // sprintOptions intentionally omitted for list and calendar: those views have
  // no task card menu and therefore no "Move to sprint" affordance.
  if (which === 'list') return <TasksListView tasks={prepared} view={view} />;
  if (which === 'calendar') return <TasksCalendarView tasks={prepared} view={view} />;
  return (
    <TasksBoardView
      tasks={tasks}
      view={view}
      internName={internName}
      workspaceId={workspaceId}
      enableListAndCalendar
      sprintBadgeBySprintId={sprintBadgeBySprintId}
      sprintOptions={sprintOptions}
    />
  );
}
