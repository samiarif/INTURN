import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------
// db.select().from(projects).where(...).limit(1) → Promise<[project]>
// vi.mock factories are hoisted above normal const declarations, so shared
// state that the factory closures reference must live in vi.hoisted().
const { db, selectResult } = vi.hoisted(() => {
  const selectResult = vi.fn<() => unknown[]>(() => [{ id: 'p1', organizationId: 'org1' }]);
  function makeChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectResult()));
    return chain;
  }
  const db = {
    select: vi.fn(() => makeChain()),
    delete: vi.fn(() => ({ where: vi.fn() })),
    insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  };
  return { db, selectResult };
});

vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({ projects: {} }));

// ---------------------------------------------------------------------------
// Auth / authz mocks
// ---------------------------------------------------------------------------
const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireActiveSession: (...a: unknown[]) => requireActiveSession(...a),
}));

const requireOrgRole = vi.fn();
vi.mock('@/modules/team/authz', () => ({
  requireOrgRole: (...a: unknown[]) => requireOrgRole(...a),
}));

// ---------------------------------------------------------------------------
// next/cache
// ---------------------------------------------------------------------------
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// ---------------------------------------------------------------------------
// Service mock
// ---------------------------------------------------------------------------
const createSprint = vi.fn();
const updateSprint = vi.fn();
const deleteSprint = vi.fn();
const reorderSprints = vi.fn();
const setSprintTaskBlueprint = vi.fn();
const createSprintsBulk = vi.fn();

vi.mock('../service', () => ({
  createSprint: (...a: unknown[]) => createSprint(...a),
  updateSprint: (...a: unknown[]) => updateSprint(...a),
  deleteSprint: (...a: unknown[]) => deleteSprint(...a),
  reorderSprints: (...a: unknown[]) => reorderSprints(...a),
  setSprintTaskBlueprint: (...a: unknown[]) => setSprintTaskBlueprint(...a),
  createSprintsBulk: (...a: unknown[]) => createSprintsBulk(...a),
}));

// ---------------------------------------------------------------------------
// Drizzle-orm stub (eq is only used to build where clauses)
// ---------------------------------------------------------------------------
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import {
  createSprintAction,
  updateSprintAction,
  deleteSprintAction,
  reorderSprintsAction,
  setSprintTasksAction,
  applySprintPlanAction,
} from '../server-actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PROJECT = { id: 'p1', organizationId: 'org1' };

function asOwner() {
  requireActiveSession.mockResolvedValue({ user: { id: 'u1' } });
  selectResult.mockReturnValue([PROJECT]);
  requireOrgRole.mockResolvedValue(undefined);
}

function asForbidden() {
  requireActiveSession.mockResolvedValue({ user: { id: 'u1' } });
  selectResult.mockReturnValue([PROJECT]);
  requireOrgRole.mockRejectedValue(new Error('Forbidden'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createSprintAction
// ---------------------------------------------------------------------------
describe('createSprintAction', () => {
  it('rejects when requireOrgRole throws — does NOT call createSprint', async () => {
    asForbidden();
    const res = await createSprintAction({ projectId: 'p1', name: 'Sprint 1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(createSprint).not.toHaveBeenCalled();
  });

  it('succeeds for an owner: gate passes, createSprint called, requireOrgRole called correctly', async () => {
    asOwner();
    createSprint.mockResolvedValue({ id: 's1', name: 'Sprint 1' });

    const res = await createSprintAction({ projectId: 'p1', name: 'Sprint 1' });

    expect(res).toEqual({ ok: true });
    expect(requireOrgRole).toHaveBeenCalledWith('u1', 'org1', ['owner', 'admin']);
    expect(createSprint).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1', name: 'Sprint 1' }));
  });

  it('returns name_required for empty name', async () => {
    asOwner();
    const res = await createSprintAction({ projectId: 'p1', name: '' });
    expect(res).toEqual({ ok: false, error: 'name_required' });
    expect(createSprint).not.toHaveBeenCalled();
  });

  it('returns name_required for whitespace-only name', async () => {
    asOwner();
    const res = await createSprintAction({ projectId: 'p1', name: '   ' });
    expect(res).toEqual({ ok: false, error: 'name_required' });
    expect(createSprint).not.toHaveBeenCalled();
  });

  it('returns project_not_found when project does not exist', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'u1' } });
    selectResult.mockReturnValue([]); // no project
    const res = await createSprintAction({ projectId: 'missing', name: 'Sprint 1' });
    expect(res).toEqual({ ok: false, error: 'project_not_found' });
    expect(requireOrgRole).not.toHaveBeenCalled();
    expect(createSprint).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// applySprintPlanAction
// ---------------------------------------------------------------------------
describe('applySprintPlanAction', () => {
  it('owner — calls createSprintsBulk and returns ok', async () => {
    asOwner();
    createSprintsBulk.mockResolvedValue(undefined);

    const sprints = [{ name: 'Sprint A' }, { name: 'Sprint B' }];
    const res = await applySprintPlanAction({ projectId: 'p1', sprints });

    expect(res).toEqual({ ok: true });
    expect(requireOrgRole).toHaveBeenCalledWith('u1', 'org1', ['owner', 'admin']);
    expect(createSprintsBulk).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', sprints }),
    );
  });

  it('rejects when requireOrgRole throws', async () => {
    asForbidden();
    const res = await applySprintPlanAction({ projectId: 'p1', sprints: [{ name: 'S' }] });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(createSprintsBulk).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateSprintAction
// ---------------------------------------------------------------------------
describe('updateSprintAction', () => {
  it('owner — calls updateSprint and returns ok', async () => {
    asOwner();
    updateSprint.mockResolvedValue(undefined);

    const res = await updateSprintAction({ projectId: 'p1', sprintId: 's1', name: 'Updated' });

    expect(res).toEqual({ ok: true });
    expect(updateSprint).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', sprintId: 's1', name: 'Updated' }),
    );
  });

  it('rejects when requireOrgRole throws', async () => {
    asForbidden();
    const res = await updateSprintAction({ projectId: 'p1', sprintId: 's1', name: 'X' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(updateSprint).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteSprintAction
// ---------------------------------------------------------------------------
describe('deleteSprintAction', () => {
  it('owner — calls deleteSprint and returns ok', async () => {
    asOwner();
    deleteSprint.mockResolvedValue(undefined);

    const res = await deleteSprintAction({ projectId: 'p1', sprintId: 's1' });

    expect(res).toEqual({ ok: true });
    expect(deleteSprint).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', sprintId: 's1' }),
    );
  });

  it('rejects when requireOrgRole throws', async () => {
    asForbidden();
    const res = await deleteSprintAction({ projectId: 'p1', sprintId: 's1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(deleteSprint).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderSprintsAction
// ---------------------------------------------------------------------------
describe('reorderSprintsAction', () => {
  it('owner — calls reorderSprints and returns ok', async () => {
    asOwner();
    reorderSprints.mockResolvedValue(undefined);

    const res = await reorderSprintsAction({ projectId: 'p1', orderedIds: ['s1', 's2'] });

    expect(res).toEqual({ ok: true });
    expect(reorderSprints).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', orderedIds: ['s1', 's2'] }),
    );
  });

  it('rejects when requireOrgRole throws', async () => {
    asForbidden();
    const res = await reorderSprintsAction({ projectId: 'p1', orderedIds: ['s1'] });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(reorderSprints).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setSprintTasksAction
// ---------------------------------------------------------------------------
describe('setSprintTasksAction', () => {
  it('owner — calls setSprintTaskBlueprint and returns ok', async () => {
    asOwner();
    setSprintTaskBlueprint.mockResolvedValue(undefined);

    const tasks = [{ title: 'Task 1', weekOffset: 0 }];
    const res = await setSprintTasksAction({ projectId: 'p1', sprintId: 's1', tasks });

    expect(res).toEqual({ ok: true });
    expect(setSprintTaskBlueprint).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', sprintId: 's1', tasks }),
    );
  });

  it('rejects when requireOrgRole throws', async () => {
    asForbidden();
    const res = await setSprintTasksAction({ projectId: 'p1', sprintId: 's1', tasks: [] });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(setSprintTaskBlueprint).not.toHaveBeenCalled();
  });
});
