import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted — mutable state shared across vi.mock factories (hoisted above
// all imports by Vitest). Mirrors the idiom from service.test.ts.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // FIFO queue for .select().from()...limit() chains
  const selectQueue: unknown[][] = [];

  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'orderBy', 'leftJoin']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }

  const db = {
    select: vi.fn(() => makeSelectChain()),
  };

  return { db, selectQueue };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  projectSprints: {
    id: 'ps_id',
    projectId: 'ps_project_id',
    orderIndex: 'ps_order_index',
    name: 'ps_name',
    goal: 'ps_goal',
    startDate: 'ps_start_date',
    endDate: 'ps_end_date',
    updatedAt: 'ps_updated_at',
    taskBlueprint: 'ps_task_blueprint',
  },
  workspaces: {
    id: 'ws_id',
    internshipId: 'ws_internship_id',
  },
  internships: {
    id: 'int_id',
    projectId: 'int_project_id',
  },
  tasks: {
    workspaceId: 't_workspace_id',
    sprintId: 't_sprint_id',
    status: 't_status',
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  asc: vi.fn(() => 'asc'),
}));
vi.mock('../active-sprint', () => ({
  // SprintProgress is a type — no runtime value needed; the import is type-only
  // in queries.ts. Stub out any runtime exports so the mock doesn't break.
}));

// ---------------------------------------------------------------------------
// Import queries AFTER mocks are set up
// ---------------------------------------------------------------------------
import { getSprintsForWorkspace, getTaskCountsBySprint } from '../queries';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

// ---------------------------------------------------------------------------
// getSprintsForWorkspace
// ---------------------------------------------------------------------------
describe('getSprintsForWorkspace', () => {
  it('resolves project via internship join then returns sprints ordered by orderIndex', async () => {
    // First select: workspace → internship row with projectId
    mocks.selectQueue.push([{ projectId: 'project-42' }]);

    const fakeSprints = [
      { id: 's1', projectId: 'project-42', name: 'Sprint 1', orderIndex: 0 },
      { id: 's2', projectId: 'project-42', name: 'Sprint 2', orderIndex: 1 },
    ];
    // Second select: sprints for the project
    mocks.selectQueue.push(fakeSprints);

    const result = await getSprintsForWorkspace('ws-1');

    expect(result).toEqual(fakeSprints);
    // db.select should have been called twice (once for join, once for sprints)
    expect(mocks.db.select).toHaveBeenCalledTimes(2);
  });

  it('returns [] when no project row resolves (workspace not found)', async () => {
    // First select returns empty — no matching workspace/internship row
    mocks.selectQueue.push([]);

    const result = await getSprintsForWorkspace('ws-missing');

    expect(result).toEqual([]);
    // Only the first select (the join) should be issued — no second DB call
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });

  it('returns [] when projectId is null on the internship', async () => {
    // internship exists but has no projectId
    mocks.selectQueue.push([{ projectId: null }]);

    const result = await getSprintsForWorkspace('ws-no-project');

    expect(result).toEqual([]);
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// getTaskCountsBySprint
// ---------------------------------------------------------------------------
describe('getTaskCountsBySprint', () => {
  it('tallies total per sprintId and done only when status === "done"', async () => {
    const rows = [
      { sprintId: 'sprint-a', status: 'todo' },
      { sprintId: 'sprint-a', status: 'done' },
      { sprintId: 'sprint-a', status: 'done' },
      { sprintId: 'sprint-b', status: 'in-progress' },
    ];
    mocks.selectQueue.push(rows);

    const map = await getTaskCountsBySprint('ws-1');

    expect(map.get('sprint-a')).toEqual({ total: 3, done: 2 });
    expect(map.get('sprint-b')).toEqual({ total: 1, done: 0 });
  });

  it('skips tasks with sprintId === null (Unsorted tasks do not appear in the map)', async () => {
    const rows = [
      { sprintId: null, status: 'done' },  // Unsorted — must be skipped
      { sprintId: 'sprint-c', status: 'done' },
    ];
    mocks.selectQueue.push(rows);

    const map = await getTaskCountsBySprint('ws-2');

    expect(map.has('sprint-c')).toBe(true);
    expect(map.size).toBe(1); // null-sprint task did NOT create an entry
  });

  it('returns an empty map when there are no tasks', async () => {
    mocks.selectQueue.push([]);

    const map = await getTaskCountsBySprint('ws-empty');

    expect(map.size).toBe(0);
  });
});
