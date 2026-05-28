import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks -----------------------------------------------------------------
// vi.mock factories are hoisted above normal `const`s, so the shared mock
// state must live in vi.hoisted() to be referenceable inside the factory.
const { db, insertValues } = vi.hoisted(() => {
  const insertValues = vi.fn();
  const db = {
    insert: vi.fn(() => ({ values: (...a: unknown[]) => insertValues(...a) })),
  };
  return { db, insertValues };
});
vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({ workspaceNotes: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const loadWorkspaceAccess = vi.fn();
vi.mock('@/modules/workspace/access', () => ({
  loadWorkspaceAccess: (...args: unknown[]) => loadWorkspaceAccess(...args),
}));

import { createNoteAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  loadWorkspaceAccess.mockResolvedValue({
    session: { role: 'company', user: { id: 'u1' } },
    workspace: { id: 'w1' },
  });
});

describe('createNoteAction', () => {
  it('rejects an empty body without touching the db', async () => {
    const result = await createNoteAction('w1', '   ');

    expect(result).toEqual({ ok: false, error: 'invalid' });
    expect(loadWorkspaceAccess).not.toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('rejects a body over the 2000-char limit', async () => {
    const result = await createNoteAction('w1', 'x'.repeat(2001));

    expect(result).toEqual({ ok: false, error: 'invalid' });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('inserts a trimmed note for a valid body and returns ok', async () => {
    const result = await createNoteAction('w1', '  Reviewed the deliverable.  ');

    expect(result).toEqual({ ok: true });
    expect(insertValues).toHaveBeenCalledTimes(1);
    const payload = insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      workspaceId: 'w1',
      authorId: 'u1',
      body: 'Reviewed the deliverable.',
    });
  });
});
