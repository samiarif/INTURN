// modules/workspace/utils/task-view-state.ts
import type { Task } from '@/db/schema';

export type FilterState = {
  phase?: string[];
  dueIn?: '7d';
  status?: 'todo' | 'in-progress' | 'review' | 'done';
};

const VALID_STATUSES = new Set(['todo', 'in-progress', 'review', 'done']);

export function parseFilterParam(raw: string | null): FilterState {
  if (!raw) return {};
  const out: FilterState = {};
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf(':');
    if (idx < 1) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    if (!value) continue;
    if (key === 'phase') {
      out.phase = [...(out.phase ?? []), value];
    } else if (key === 'dueIn' && value === '7d') {
      out.dueIn = '7d';
    } else if (key === 'status' && VALID_STATUSES.has(value)) {
      out.status = value as FilterState['status'];
    }
  }
  return out;
}

export function serializeFilterParam(state: FilterState): string | undefined {
  const parts: string[] = [];
  if (state.phase) for (const p of state.phase) parts.push(`phase:${p}`);
  if (state.dueIn) parts.push(`dueIn:${state.dueIn}`);
  if (state.status) parts.push(`status:${state.status}`);
  return parts.length > 0 ? parts.join(',') : undefined;
}

export function derivePhasesFromTasks(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const t of tasks) {
    if (!t.tag) continue;
    const idx = t.tag.indexOf('-');
    if (idx < 1) continue;
    set.add(t.tag.slice(0, idx));
  }
  return [...set].sort();
}

const PRIORITY_RANK: Record<NonNullable<Task['priority']>, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function dueRank(t: Task): number {
  if (!t.dueDate) return Number.POSITIVE_INFINITY;
  return new Date(t.dueDate).getTime();
}

export function compareByDue(a: Task, b: Task): number {
  return dueRank(a) - dueRank(b);
}

export function compareByPriority(a: Task, b: Task): number {
  return PRIORITY_RANK[a.priority ?? 'medium'] - PRIORITY_RANK[b.priority ?? 'medium'];
}

export function compareByTitle(a: Task, b: Task): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function compareByCreated(a: Task, b: Task): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export type SortKey = 'due' | 'priority' | 'title' | 'created';

export function sortTasks(tasks: Task[], sortKey: SortKey | string | null): Task[] {
  const copy = tasks.slice();
  switch (sortKey) {
    case 'priority': return copy.sort(compareByPriority);
    case 'title':    return copy.sort(compareByTitle);
    case 'created':  return copy.sort(compareByCreated);
    case 'due':
    default:         return copy.sort(compareByDue);
  }
}

export function filterTasks(tasks: Task[], filter: FilterState): Task[] {
  if (!filter.phase && !filter.dueIn && !filter.status) return tasks;
  const weekFromNow = Date.now() + 7 * 86400_000;
  return tasks.filter((t) => {
    if (filter.phase && filter.phase.length > 0) {
      const prefix = t.tag?.split('-')[0];
      if (!prefix || !filter.phase.includes(prefix)) return false;
    }
    if (filter.dueIn === '7d') {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate).getTime();
      if (due > weekFromNow) return false;
    }
    if (filter.status && t.status !== filter.status) return false;
    return true;
  });
}
