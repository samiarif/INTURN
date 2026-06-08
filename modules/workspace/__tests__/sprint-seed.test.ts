import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted — mutable state shared across vi.mock factories (hoisted above
// all imports by Vitest). Mirrors the mocked-db pattern from
// modules/sprints/__tests__/service.test.ts.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // FIFO queue for .select().from().innerJoin().where()?.orderBy()?.limit() chains
  const selectQueue: unknown[][] = [];

  // Track every insert call's values fn
  const insertValuesFn = vi.fn(() => Promise.resolve());

  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'orderBy', 'leftJoin']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => {
      return Promise.resolve(selectQueue.shift() ?? []);
    });
    return chain;
  }

  const db = {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => ({
      values: insertValuesFn,
    })),
  };

  return { db, selectQueue, insertValuesFn };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  workspaces: { id: 'ws_id', internshipId: 'ws_internship_id' },
  internships: { id: 'int_id', projectId: 'int_project_id' },
  projectSprints: {
    id: 'ps_id',
    projectId: 'ps_project_id',
    orderIndex: 'ps_order_index',
    taskBlueprint: 'ps_task_blueprint',
  },
  tasks: {
    id: 't_id',
    workspaceId: 't_workspace_id',
    sprintId: 't_sprint_id',
    title: 't_title',
    description: 't_description',
    status: 't_status',
    order: 't_order',
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
  asc: vi.fn(() => 'asc'),
  isNotNull: vi.fn(() => 'isNotNull'),
}));

// ---------------------------------------------------------------------------
// Import service AFTER mocks are set up
// ---------------------------------------------------------------------------
import { seedWorkspaceFromSprints } from '../sprint-seed';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function makeSprint(
  id: string,
  orderIndex: number,
  blueprint: Array<{ title: string; description?: string }>,
) {
  return {
    id,
    projectId: 'project-1',
    name: `Sprint ${orderIndex + 1}`,
    goal: null,
    orderIndex,
    startDate: null,
    endDate: null,
    taskBlueprint: blueprint,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('seedWorkspaceFromSprints', () => {
  it('returns 0 when workspace/project row not found', async () => {
    // select 1: workspace→internship join → empty
    mocks.selectQueue.push([]);

    const result = await seedWorkspaceFromSprints('ws-missing');
    expect(result).toBe(0);
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it('returns 0 when project has 0 sprints', async () => {
    // select 1: resolve projectId
    mocks.selectQueue.push([{ projectId: 'project-1' }]);
    // select 2: load sprints → empty
    mocks.selectQueue.push([]);
    // select 3 (idempotency) should NOT be reached
    mocks.selectQueue.push([]);

    const result = await seedWorkspaceFromSprints('ws-1');
    expect(result).toBe(0);
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it('returns 0 (idempotency guard) when sprint-linked task already exists', async () => {
    // select 1: resolve projectId
    mocks.selectQueue.push([{ projectId: 'project-1' }]);
    // select 2: load sprints → one sprint with blueprint
    mocks.selectQueue.push([makeSprint('sprint-1', 0, [{ title: 'Task A' }])]);
    // select 3: idempotency check → existing task found
    mocks.selectQueue.push([{ id: 'task-existing' }]);

    const result = await seedWorkspaceFromSprints('ws-1');
    expect(result).toBe(0);
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it('inserts blueprint tasks from a single sprint, returns count', async () => {
    // select 1: resolve projectId
    mocks.selectQueue.push([{ projectId: 'project-1' }]);
    // select 2: load sprints → one sprint with 2-item blueprint
    mocks.selectQueue.push([
      makeSprint('sprint-1', 0, [
        { title: 'Task A', description: 'Do A' },
        { title: 'Task B' },
      ]),
    ]);
    // select 3: idempotency check → no existing sprint-linked tasks
    mocks.selectQueue.push([]);

    const result = await seedWorkspaceFromSprints('ws-1');
    expect(result).toBe(2);
    expect(mocks.db.insert).toHaveBeenCalledTimes(2);

    const calls = mocks.insertValuesFn.mock.calls as unknown[][];
    expect(calls[0]).toMatchObject([
      expect.objectContaining({
        workspaceId: 'ws-1',
        sprintId: 'sprint-1',
        title: 'Task A',
        description: 'Do A',
        status: 'todo',
        order: 0,
      }),
    ]);
    expect(calls[1]).toMatchObject([
      expect.objectContaining({
        workspaceId: 'ws-1',
        sprintId: 'sprint-1',
        title: 'Task B',
        description: null,
        status: 'todo',
        order: 1,
      }),
    ]);
  });

  it('inserts tasks across multiple sprints with ascending order across sprint boundaries', async () => {
    // select 1: resolve projectId
    mocks.selectQueue.push([{ projectId: 'project-1' }]);
    // select 2: load sprints → two sprints
    mocks.selectQueue.push([
      makeSprint('sprint-1', 0, [{ title: 'A' }, { title: 'B' }]),
      makeSprint('sprint-2', 1, [{ title: 'C' }]),
    ]);
    // select 3: idempotency check → clean
    mocks.selectQueue.push([]);

    const result = await seedWorkspaceFromSprints('ws-1');
    expect(result).toBe(3);
    expect(mocks.db.insert).toHaveBeenCalledTimes(3);

    const calls = mocks.insertValuesFn.mock.calls as unknown[][];
    // order must be 0, 1, 2 — ascending across sprint boundaries
    expect(calls[0]).toMatchObject([expect.objectContaining({ sprintId: 'sprint-1', title: 'A', order: 0 })]);
    expect(calls[1]).toMatchObject([expect.objectContaining({ sprintId: 'sprint-1', title: 'B', order: 1 })]);
    expect(calls[2]).toMatchObject([expect.objectContaining({ sprintId: 'sprint-2', title: 'C', order: 2 })]);
  });

  it('skips a sprint with empty blueprint (no inserts for that sprint)', async () => {
    // select 1: resolve projectId
    mocks.selectQueue.push([{ projectId: 'project-1' }]);
    // select 2: sprint-1 has blueprint, sprint-2 has empty
    mocks.selectQueue.push([
      makeSprint('sprint-1', 0, [{ title: 'X' }]),
      makeSprint('sprint-2', 1, []),
    ]);
    // select 3: idempotency check → clean
    mocks.selectQueue.push([]);

    const result = await seedWorkspaceFromSprints('ws-1');
    expect(result).toBe(1);
    expect(mocks.db.insert).toHaveBeenCalledTimes(1);
    const calls = mocks.insertValuesFn.mock.calls as unknown[][];
    expect(calls[0]).toMatchObject([expect.objectContaining({ sprintId: 'sprint-1', title: 'X', order: 0 })]);
  });

  it('resolves project via workspace → internship join (verifies correct drizzle calls)', async () => {
    const { eq, asc, isNotNull } = await import('drizzle-orm');

    mocks.selectQueue.push([{ projectId: 'project-1' }]);
    mocks.selectQueue.push([]);
    mocks.selectQueue.push([]);

    await seedWorkspaceFromSprints('ws-abc');

    // First select: must use eq on workspaces.id
    expect(mocks.db.select).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith(expect.anything(), 'ws-abc');

    // Third select: isNotNull used for idempotency guard (would have been
    // called had sprints been returned, but sprints empty → stops at step 2).
    // With no sprints the function returns early, so isNotNull is NOT called.
    expect(isNotNull).not.toHaveBeenCalled();
    // asc IS called during query construction even when 0 sprints are returned;
    // the early-return happens after the query resolves, not before it's built.
    expect(asc).toHaveBeenCalled();
  });

  it('uses isNotNull and and() in idempotency guard select', async () => {
    const { isNotNull, and } = await import('drizzle-orm');

    mocks.selectQueue.push([{ projectId: 'project-1' }]);
    mocks.selectQueue.push([makeSprint('s1', 0, [{ title: 'T' }])]);
    mocks.selectQueue.push([]); // no existing → proceed to insert

    await seedWorkspaceFromSprints('ws-1');

    expect(isNotNull).toHaveBeenCalled();
    expect(and).toHaveBeenCalled();
  });
});
