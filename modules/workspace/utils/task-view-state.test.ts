// modules/workspace/utils/task-view-state.test.ts
import { describe, it, expect } from 'vitest';
import { parseFilterParam } from './task-view-state';

describe('parseFilterParam', () => {
  it('parses a single key:value', () => {
    expect(parseFilterParam('dueIn:7d')).toEqual({ dueIn: '7d' });
  });
  it('parses multiple comma-separated pairs', () => {
    expect(parseFilterParam('phase:BA,dueIn:7d')).toEqual({ phase: ['BA'], dueIn: '7d' });
  });
  it('parses multiple phases as a list', () => {
    expect(parseFilterParam('phase:BA,phase:UX')).toEqual({ phase: ['BA', 'UX'] });
  });
  it('parses status filter', () => {
    expect(parseFilterParam('status:todo')).toEqual({ status: 'todo' });
  });
  it('returns empty object for null', () => {
    expect(parseFilterParam(null)).toEqual({});
  });
  it('returns empty object for empty string', () => {
    expect(parseFilterParam('')).toEqual({});
  });
  it('silently drops malformed pairs', () => {
    expect(parseFilterParam('garbage,dueIn:7d')).toEqual({ dueIn: '7d' });
  });
  it('silently drops unknown keys', () => {
    expect(parseFilterParam('badkey:foo,dueIn:7d')).toEqual({ dueIn: '7d' });
  });
});

import { serializeFilterParam, derivePhasesFromTasks, compareByDue, compareByPriority, compareByTitle, compareByCreated, sortTasks, filterTasks } from './task-view-state';
import type { Task } from '@/db/schema';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    workspaceId: 'ws-1',
    tag: null,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

describe('serializeFilterParam', () => {
  it('returns undefined for empty state', () => {
    expect(serializeFilterParam({})).toBeUndefined();
  });
  it('serializes a single key', () => {
    expect(serializeFilterParam({ dueIn: '7d' })).toBe('dueIn:7d');
  });
  it('serializes multiple phases', () => {
    expect(serializeFilterParam({ phase: ['BA', 'UX'] })).toBe('phase:BA,phase:UX');
  });
  it('round-trips with parseFilterParam', () => {
    const state = { phase: ['BA'], dueIn: '7d' as const, status: 'todo' as const };
    const serialized = serializeFilterParam(state);
    expect(serialized).toBeDefined();
    expect(parseFilterParam(serialized!)).toEqual(state);
  });
});

describe('derivePhasesFromTasks', () => {
  it('returns unique prefixes alphabetically', () => {
    const tasks = [
      makeTask({ tag: 'BA-1' }),
      makeTask({ tag: 'UX-3' }),
      makeTask({ tag: 'BA-2' }),
    ];
    expect(derivePhasesFromTasks(tasks)).toEqual(['BA', 'UX']);
  });
  it('skips tasks without tags', () => {
    expect(derivePhasesFromTasks([makeTask({ tag: null })])).toEqual([]);
  });
  it('skips tags without a dash', () => {
    expect(derivePhasesFromTasks([makeTask({ tag: 'plain' })])).toEqual([]);
  });
});

describe('compareByDue', () => {
  it('orders overdue < today < later < no-date', () => {
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    const a = makeTask({ id: 'a', dueDate: yesterday });
    const b = makeTask({ id: 'b', dueDate: tomorrow });
    const c = makeTask({ id: 'c', dueDate: null });
    const sorted = [c, b, a].sort(compareByDue);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('compareByPriority', () => {
  it('orders high before medium before low', () => {
    const a = makeTask({ id: 'a', priority: 'low' });
    const b = makeTask({ id: 'b', priority: 'high' });
    const c = makeTask({ id: 'c', priority: 'medium' });
    const sorted = [a, b, c].sort(compareByPriority);
    expect(sorted.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('compareByTitle', () => {
  it('orders alphabetically case-insensitive', () => {
    const a = makeTask({ id: 'a', title: 'beta' });
    const b = makeTask({ id: 'b', title: 'Alpha' });
    const sorted = [a, b].sort(compareByTitle);
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('compareByCreated', () => {
  it('orders newest first', () => {
    const a = makeTask({ id: 'a', createdAt: new Date('2026-01-01') });
    const b = makeTask({ id: 'b', createdAt: new Date('2026-02-01') });
    const sorted = [a, b].sort(compareByCreated);
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('sortTasks', () => {
  it('dispatches by sort key, defaults to due', () => {
    const a = makeTask({ id: 'a', priority: 'high', title: 'Z' });
    const b = makeTask({ id: 'b', priority: 'low', title: 'A' });
    expect(sortTasks([a, b], 'priority').map((t) => t.id)).toEqual(['a', 'b']);
    expect(sortTasks([a, b], 'title').map((t) => t.id)).toEqual(['b', 'a']);
    expect(sortTasks([a, b], null).map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('filterTasks', () => {
  it('returns all when filter is empty', () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    expect(filterTasks(tasks, {})).toHaveLength(2);
  });
  it('filters by phase prefix', () => {
    const a = makeTask({ id: 'a', tag: 'BA-1' });
    const b = makeTask({ id: 'b', tag: 'UX-1' });
    const c = makeTask({ id: 'c', tag: null });
    expect(filterTasks([a, b, c], { phase: ['BA'] }).map((t) => t.id)).toEqual(['a']);
  });
  it('filters by dueIn:7d (next 7 days, excluding done)', () => {
    const inWeek = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
    const a = makeTask({ id: 'a', dueDate: inWeek });
    const b = makeTask({ id: 'b', dueDate: later });
    const c = makeTask({ id: 'c', dueDate: inWeek, status: 'done' });
    expect(filterTasks([a, b, c], { dueIn: '7d' }).map((t) => t.id)).toEqual(['a']);
  });
  it('filters by status', () => {
    const a = makeTask({ id: 'a', status: 'todo' });
    const b = makeTask({ id: 'b', status: 'done' });
    expect(filterTasks([a, b], { status: 'todo' }).map((t) => t.id)).toEqual(['a']);
  });
  it('combines filters with AND', () => {
    const a = makeTask({ id: 'a', tag: 'BA-1', status: 'todo' });
    const b = makeTask({ id: 'b', tag: 'BA-2', status: 'done' });
    expect(filterTasks([a, b], { phase: ['BA'], status: 'todo' }).map((t) => t.id)).toEqual(['a']);
  });
});
