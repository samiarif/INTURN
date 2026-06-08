import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock state — must live in vi.hoisted() so factories can close over it.
// selectResult is a FIFO queue (shift) so we can stage different results for
// successive db.select() calls within one action.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // Queue of arrays — each entry is what one .limit() call resolves to.
  const selectQueue: unknown[][] = [];

  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'orderBy', 'leftJoin']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }

  const updateSetFn = vi.fn(() => ({ where: vi.fn() }));
  const db = {
    select: vi.fn(() => makeSelectChain()),
    update: vi.fn(() => ({ set: updateSetFn })),
  };

  return { db, selectQueue, updateSetFn };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  workspaces: {},
  internships: {},
  projectSprints: {},
  tasks: {},
}));

// ---------------------------------------------------------------------------
// Auth / authz mocks
// ---------------------------------------------------------------------------
const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireActiveSession: (...a: unknown[]) => requireActiveSession(...a),
}));

const getActiveMembership = vi.fn();
vi.mock('@/modules/team/authz', () => ({
  getActiveMembership: (...a: unknown[]) => getActiveMembership(...a),
}));

// ---------------------------------------------------------------------------
// next/cache
// ---------------------------------------------------------------------------
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// ---------------------------------------------------------------------------
// sprint-seed mock
// ---------------------------------------------------------------------------
const seedWorkspaceFromSprints = vi.fn();
vi.mock('../sprint-seed', () => ({
  seedWorkspaceFromSprints: (...a: unknown[]) => seedWorkspaceFromSprints(...a),
}));

// ---------------------------------------------------------------------------
// drizzle-orm stub
// ---------------------------------------------------------------------------
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq-clause'),
  and: vi.fn(() => 'and-clause'),
}));

// ---------------------------------------------------------------------------
// Import AFTER all mocks
// ---------------------------------------------------------------------------
import { applySprintPlanAction, setTaskSprintAction } from '../sprint-actions';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const WS = { id: 'ws-1', internId: 'intern-user', organizationId: 'org-1', internshipId: 'int-1' };
const WS_WITH_PROJECT = { ws: WS, projectId: 'proj-1' };

function asIntern() {
  requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
  // loadWorkspace: single select result
  mocks.selectQueue.push([WS_WITH_PROJECT]);
}

function asOwner() {
  requireActiveSession.mockResolvedValue({ user: { id: 'owner-user' } });
  mocks.selectQueue.push([WS_WITH_PROJECT]);
  getActiveMembership.mockResolvedValue({ role: 'owner' });
}

function asAdmin() {
  requireActiveSession.mockResolvedValue({ user: { id: 'admin-user' } });
  mocks.selectQueue.push([WS_WITH_PROJECT]);
  getActiveMembership.mockResolvedValue({ role: 'admin' });
}

function asForbidden() {
  // caller is neither intern nor owner/admin
  requireActiveSession.mockResolvedValue({ user: { id: 'random-user' } });
  mocks.selectQueue.push([WS_WITH_PROJECT]);
  getActiveMembership.mockResolvedValue({ role: 'supervisor' });
}

function asForbiddenNoMembership() {
  requireActiveSession.mockResolvedValue({ user: { id: 'random-user' } });
  mocks.selectQueue.push([WS_WITH_PROJECT]);
  getActiveMembership.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

// ===========================================================================
// applySprintPlanAction
// ===========================================================================
describe('applySprintPlanAction', () => {
  it('intern — calls seedWorkspaceFromSprints + revalidates both paths', async () => {
    asIntern();
    seedWorkspaceFromSprints.mockResolvedValue(3);

    const res = await applySprintPlanAction({ workspaceId: 'ws-1' });

    expect(res).toEqual({ ok: true });
    expect(seedWorkspaceFromSprints).toHaveBeenCalledWith('ws-1');
    expect(revalidatePath).toHaveBeenCalledWith('/intern/workspaces/ws-1');
    expect(revalidatePath).toHaveBeenCalledWith('/company/workspaces/ws-1');
  });

  it('owner — gate passes, calls seedWorkspaceFromSprints', async () => {
    asOwner();
    seedWorkspaceFromSprints.mockResolvedValue(2);

    const res = await applySprintPlanAction({ workspaceId: 'ws-1' });

    expect(res).toEqual({ ok: true });
    expect(seedWorkspaceFromSprints).toHaveBeenCalledWith('ws-1');
    expect(getActiveMembership).toHaveBeenCalledWith('owner-user', 'org-1');
  });

  it('admin — gate passes', async () => {
    asAdmin();
    seedWorkspaceFromSprints.mockResolvedValue(0);

    const res = await applySprintPlanAction({ workspaceId: 'ws-1' });

    expect(res).toEqual({ ok: true });
  });

  it('IDOR: non-intern non-owner/admin member returns Forbidden', async () => {
    asForbidden();

    const res = await applySprintPlanAction({ workspaceId: 'ws-1' });

    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(seedWorkspaceFromSprints).not.toHaveBeenCalled();
  });

  it('IDOR: no membership returns Forbidden', async () => {
    asForbiddenNoMembership();

    const res = await applySprintPlanAction({ workspaceId: 'ws-1' });

    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(seedWorkspaceFromSprints).not.toHaveBeenCalled();
  });

  it('returns workspace_not_found when workspace does not exist', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'any-user' } });
    mocks.selectQueue.push([]); // empty result for loadWorkspace

    const res = await applySprintPlanAction({ workspaceId: 'ws-missing' });

    expect(res).toEqual({ ok: false, error: 'workspace_not_found' });
    expect(seedWorkspaceFromSprints).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// setTaskSprintAction
// ===========================================================================
describe('setTaskSprintAction', () => {
  const TASK = { id: 'task-1', workspaceId: 'ws-1', sprintId: null };

  it('intern — clears sprint (null) + revalidates', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
    // 1st select: load task
    mocks.selectQueue.push([TASK]);
    // 2nd select: gateWorkspace loadWorkspace
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    // no 3rd select — sprintId is null, skip sprint validation

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: null });

    expect(res).toEqual({ ok: true });
    expect(mocks.db.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/intern/workspaces/ws-1');
    expect(revalidatePath).toHaveBeenCalledWith('/company/workspaces/ws-1');
  });

  it('intern — sets valid sprint + revalidates', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
    // 1st select: load task
    mocks.selectQueue.push([TASK]);
    // 2nd select: gateWorkspace
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    // 3rd select: sprint validation — sprint found in correct project
    mocks.selectQueue.push([{ id: 'sprint-1' }]);

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: 'sprint-1' });

    expect(res).toEqual({ ok: true });
    expect(mocks.db.update).toHaveBeenCalled();
  });

  it('owner — sets valid sprint', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'owner-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    getActiveMembership.mockResolvedValue({ role: 'owner' });
    mocks.selectQueue.push([{ id: 'sprint-1' }]);

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: 'sprint-1' });

    expect(res).toEqual({ ok: true });
  });

  it('admin — gate passes, sets valid sprint + revalidates', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'admin-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    getActiveMembership.mockResolvedValue({ role: 'admin' });
    mocks.selectQueue.push([{ id: 'sprint-1' }]);

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: 'sprint-1' });

    expect(res).toEqual({ ok: true });
    expect(mocks.db.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/intern/workspaces/ws-1');
    expect(revalidatePath).toHaveBeenCalledWith('/company/workspaces/ws-1');
  });

  it('IDOR: non-intern non-owner/admin returns Forbidden', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'random-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    getActiveMembership.mockResolvedValue({ role: 'supervisor' });

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: 'sprint-1' });

    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it('IDOR: no membership returns Forbidden', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'random-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    getActiveMembership.mockResolvedValue(null);

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: null });

    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it('cross-project: sprint from different project returns invalid_sprint', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    // Sprint validation: sprint NOT found for this project → empty result
    mocks.selectQueue.push([]);

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: 'sprint-other-proj' });

    expect(res).toEqual({ ok: false, error: 'invalid_sprint' });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it('invalid_sprint when workspace has no linked project (projectId null)', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
    // 1st select: load task
    mocks.selectQueue.push([TASK]);
    // 2nd select: gateWorkspace — workspace whose internship has no project
    mocks.selectQueue.push([{ ws: WS, projectId: null }]);
    // no 3rd select — projectId-null branch returns early before sprint query

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: 'sprint-1' });

    expect(res).toEqual({ ok: false, error: 'invalid_sprint' });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it('null sprintId skips sprint cross-project check (no 3rd select)', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    // if sprint validation were attempted we'd get unexpected behavior
    // because queue is empty — test passes if db.update IS called
    seedWorkspaceFromSprints.mockResolvedValue(0);

    const res = await setTaskSprintAction({ taskId: 'task-1', sprintId: null });

    expect(res).toEqual({ ok: true });
    // confirm update happened — sprintId check was skipped
    expect(mocks.db.update).toHaveBeenCalled();
  });

  it('returns task_not_found when task does not exist', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'any-user' } });
    mocks.selectQueue.push([]); // task not found

    const res = await setTaskSprintAction({ taskId: 'task-missing', sprintId: null });

    expect(res).toEqual({ ok: false, error: 'task_not_found' });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it('update is called with correct sprintId and updatedAt', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);
    mocks.selectQueue.push([{ id: 'sprint-1' }]);

    await setTaskSprintAction({ taskId: 'task-1', sprintId: 'sprint-1' });

    expect(mocks.updateSetFn).toHaveBeenCalledWith(
      expect.objectContaining({ sprintId: 'sprint-1', updatedAt: expect.any(Date) }),
    );
  });

  it('update is called with sprintId: null when clearing', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'intern-user' } });
    mocks.selectQueue.push([TASK]);
    mocks.selectQueue.push([WS_WITH_PROJECT]);

    await setTaskSprintAction({ taskId: 'task-1', sprintId: null });

    expect(mocks.updateSetFn).toHaveBeenCalledWith(
      expect.objectContaining({ sprintId: null, updatedAt: expect.any(Date) }),
    );
  });
});
