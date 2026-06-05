import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted — mutable state shared across vi.mock factories (hoisted above
// all imports by Vitest). Mirror the exact idiom from team/__tests__/service.test.ts.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const callOrder: string[] = [];

  // FIFO queue for .select().from().where()?.limit() chains
  const selectQueue: unknown[][] = [];

  // Track every update call
  const updateWhere = vi.fn(() => ({
    then: (resolve: (v: unknown[]) => void) => {
      callOrder.push('update');
      resolve([]);
    },
  }));

  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'orderBy', 'leftJoin']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => {
      callOrder.push('select');
      return Promise.resolve(selectQueue.shift() ?? []);
    });
    return chain;
  }

  const insertReturning = vi.fn(() => {
    callOrder.push('insert');
    return Promise.resolve([
      {
        id: 'sprint-1',
        projectId: 'project-1',
        name: 'Sprint 1',
        goal: null,
        orderIndex: 0,
        startDate: null,
        endDate: null,
        taskBlueprint: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  const deleteWhere = vi.fn(() => {
    callOrder.push('delete');
    return Promise.resolve();
  });

  const db = {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: insertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: updateWhere })),
    })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };

  return { db, callOrder, selectQueue, insertReturning, updateWhere, deleteWhere };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  projectSprints: {
    id: 'ps_id',
    projectId: 'ps_project_id',
    orderIndex: 'ps_order_index',
    taskBlueprint: 'ps_task_blueprint',
    name: 'ps_name',
    goal: 'ps_goal',
    startDate: 'ps_start_date',
    endDate: 'ps_end_date',
    updatedAt: 'ps_updated_at',
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
  sql: Object.assign(vi.fn(() => 'sql'), {
    raw: vi.fn(() => 'sql.raw'),
  }),
  asc: vi.fn(() => 'asc'),
}));

// ---------------------------------------------------------------------------
// Import service AFTER mocks are set up
// ---------------------------------------------------------------------------
import {
  createSprint,
  updateSprint,
  setSprintTaskBlueprint,
  deleteSprint,
  reorderSprints,
  createSprintsBulk,
} from '../service';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callOrder.length = 0;
  mocks.selectQueue.length = 0;
});

// ---------------------------------------------------------------------------
// createSprint
// ---------------------------------------------------------------------------
describe('createSprint', () => {
  it('creates sprint with orderIndex = max+1 when existing sprints exist', async () => {
    // Queue the max(order_index) select → returns max=2, so orderIndex should be 3
    mocks.selectQueue.push([{ max: 2 }]);

    const fakeInserted = {
      id: 'sprint-new',
      projectId: 'proj-1',
      name: 'Sprint 3',
      goal: null,
      orderIndex: 3,
      startDate: null,
      endDate: null,
      taskBlueprint: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mocks.insertReturning.mockResolvedValueOnce([fakeInserted] as unknown as never);

    const result = await createSprint({ projectId: 'proj-1', name: 'Sprint 3' });

    expect(result).toMatchObject({ id: 'sprint-new', name: 'Sprint 3' });
    // Verify the insert was called with correct orderIndex (max+1 = 3)
    const insertValues = mocks.db.insert.mock.results[0]?.value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        name: 'Sprint 3',
        orderIndex: 3,
        taskBlueprint: [],
      }),
    );
    expect(mocks.callOrder).toContain('select');
    expect(mocks.db.insert).toHaveBeenCalled();
  });

  it('creates sprint with orderIndex = 0 when no existing sprints (max=null)', async () => {
    // Queue the max select → returns max=null (coalesce returns -1, so next is 0)
    mocks.selectQueue.push([{ max: null }]);

    const fakeInserted = {
      id: 'sprint-first',
      projectId: 'proj-1',
      name: 'Sprint 1',
      goal: null,
      orderIndex: 0,
      startDate: null,
      endDate: null,
      taskBlueprint: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mocks.insertReturning.mockResolvedValueOnce([fakeInserted] as unknown as never);

    await createSprint({ projectId: 'proj-1', name: 'Sprint 1' });

    const insertValues = mocks.db.insert.mock.results[0]?.value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orderIndex: 0,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// setSprintTaskBlueprint
// ---------------------------------------------------------------------------
describe('setSprintTaskBlueprint', () => {
  it('updates taskBlueprint to the given array', async () => {
    const tasks = [
      { title: 'Task 1', description: 'Do thing 1' },
      { title: 'Task 2' },
    ];

    await setSprintTaskBlueprint({ projectId: 'proj-1', sprintId: 'sprint-1', tasks });

    expect(mocks.db.update).toHaveBeenCalled();
    const updateSet = mocks.db.update.mock.results[0]?.value.set;
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ taskBlueprint: tasks }),
    );
    expect(mocks.callOrder).toContain('update');
  });
});

// ---------------------------------------------------------------------------
// reorderSprints
// ---------------------------------------------------------------------------
describe('reorderSprints', () => {
  it('issues one update per sprint id with correct orderIndex 0,1,2', async () => {
    const orderedIds = ['a', 'b', 'c'];

    await reorderSprints({ projectId: 'proj-1', orderedIds });

    expect(mocks.db.update).toHaveBeenCalledTimes(3);

    // Each call should set the correct orderIndex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sets = mocks.db.update.mock.results.map((r: any) => r.value.set);
    expect(sets[0]).toHaveBeenCalledWith(expect.objectContaining({ orderIndex: 0 }));
    expect(sets[1]).toHaveBeenCalledWith(expect.objectContaining({ orderIndex: 1 }));
    expect(sets[2]).toHaveBeenCalledWith(expect.objectContaining({ orderIndex: 2 }));
  });
});

// ---------------------------------------------------------------------------
// deleteSprint
// ---------------------------------------------------------------------------
describe('deleteSprint', () => {
  it('issues a delete scoped to the sprint id and project id', async () => {
    await deleteSprint({ projectId: 'proj-1', sprintId: 'sprint-1' });

    expect(mocks.db.delete).toHaveBeenCalled();
    expect(mocks.deleteWhere).toHaveBeenCalled();
    expect(mocks.callOrder).toContain('delete');
  });
});

// ---------------------------------------------------------------------------
// updateSprint
// ---------------------------------------------------------------------------
describe('updateSprint', () => {
  it('updates the sprint fields provided', async () => {
    await updateSprint({ projectId: 'proj-1', sprintId: 'sprint-1', name: 'Renamed Sprint' });

    expect(mocks.db.update).toHaveBeenCalled();
    const updateSet = mocks.db.update.mock.results[0]?.value.set;
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Renamed Sprint' }),
    );
  });
});

// ---------------------------------------------------------------------------
// createSprintsBulk
// ---------------------------------------------------------------------------
describe('createSprintsBulk', () => {
  it('creates multiple sprints starting from max+1', async () => {
    // Queue max select: existing max = 1, next = 2
    mocks.selectQueue.push([{ max: 1 }]);

    await createSprintsBulk({
      projectId: 'proj-1',
      sprints: [
        { name: 'Sprint A', goal: 'Goal A' },
        { name: 'Sprint B' },
      ],
    });

    // Should insert twice
    expect(mocks.db.insert).toHaveBeenCalledTimes(2);

    const firstInsertValues = mocks.db.insert.mock.results[0]?.value.values;
    const secondInsertValues = mocks.db.insert.mock.results[1]?.value.values;

    expect(firstInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sprint A', orderIndex: 2, taskBlueprint: [] }),
    );
    expect(secondInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sprint B', orderIndex: 3, taskBlueprint: [] }),
    );
  });
});
