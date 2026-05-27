'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Task } from '@/db/schema';
import {
  parseFilterParam,
  filterTasks,
  sortTasks,
  type SortKey,
} from '@/modules/workspace/utils/task-view-state';
import { TasksBoardView } from './tasks-board-view';
import { TasksListView } from './tasks-list-view';
import { TasksCalendarView } from './tasks-calendar-view';

type Props = {
  tasks: Task[];
  view: 'intern' | 'supervisor';
  internName: string;
  workspaceId: string;
};

export function TasksViewsShell({ tasks, view, internName, workspaceId }: Props) {
  const params = useSearchParams();
  const which = params.get('view') ?? 'board';
  const filter = parseFilterParam(params.get('filter'));
  const sortKey = (params.get('sort') ?? 'due') as SortKey;

  const prepared = useMemo(() => sortTasks(filterTasks(tasks, filter), sortKey), [tasks, filter, sortKey]);

  if (which === 'list') return <TasksListView tasks={prepared} view={view} />;
  if (which === 'calendar') return <TasksCalendarView tasks={prepared} view={view} />;
  return (
    <TasksBoardView
      tasks={tasks}
      view={view}
      internName={internName}
      workspaceId={workspaceId}
      enableListAndCalendar
    />
  );
}
