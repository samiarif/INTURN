import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks -----------------------------------------------------------------
// db is a chainable Drizzle-ish builder. The action does:
//   db.select().from(tasks).where(eq(...)).limit(1)  -> Promise<[task]>
//   db.delete(tasks).where(eq(...))                  -> Promise<void>
// We make every chain method return the same thenable object; `limit`
// resolves to the queued select result, and `delete().where()` resolves to
// undefined while recording that it was called.
// vi.mock factories are hoisted above normal `const`s, so the shared mock
// state must live in vi.hoisted() to be referenceable inside the factory.
const { db, selectResult, deleteWhere } = vi.hoisted(() => {
  const selectResult = vi.fn<() => unknown[]>(() => []);
  const deleteWhere = vi.fn();
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
    delete: vi.fn(() => ({ where: (...a: unknown[]) => deleteWhere(...a) })),
    insert: vi.fn(() => ({ values: vi.fn() })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  };
  return { db, selectResult, deleteWhere };
});
vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({ tasks: {} }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// drizzle-orm's eq is only used to build the where clause; a stub is fine.
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));

const loadWorkspaceAccess = vi.fn();
vi.mock('@/modules/workspace/access', () => ({
  loadWorkspaceAccess: (...args: unknown[]) => loadWorkspaceAccess(...args),
}));

// service.createTask / moveTask are imported by the module but not exercised
// by deleteTaskAction; stub them so the import resolves.
vi.mock('../service', () => ({ createTask: vi.fn(), moveTask: vi.fn() }));

import { deleteTaskAction } from '../server-actions';

const fakeTask = { id: 't1', workspaceId: 'w1' };

function setAccess(role: 'intern' | 'company' | 'admin') {
  loadWorkspaceAccess.mockResolvedValue({
    session: { role, user: { id: 'u1' } },
    workspace: { id: 'w1' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectResult.mockReturnValue([fakeTask]);
});

describe('deleteTaskAction', () => {
  it('forbids an intern from deleting (delete is supervisor-only)', async () => {
    setAccess('intern');

    const result = await deleteTaskAction('t1');

    expect(result).toEqual({ ok: false, error: 'forbidden' });
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it('allows a company supervisor to delete and issues the db.delete', async () => {
    setAccess('company');

    const result = await deleteTaskAction('t1');

    expect(result).toEqual({ ok: true });
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
  });

  it('returns not_found when the task does not exist', async () => {
    selectResult.mockReturnValue([]);
    setAccess('company');

    const result = await deleteTaskAction('missing');

    expect(result).toEqual({ ok: false, error: 'not_found' });
    // Authz is never reached, and nothing is deleted.
    expect(loadWorkspaceAccess).not.toHaveBeenCalled();
    expect(deleteWhere).not.toHaveBeenCalled();
  });
});
