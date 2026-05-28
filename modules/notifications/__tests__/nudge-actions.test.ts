import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks -----------------------------------------------------------------
// sendNudgeAction issues several db.select chains in sequence:
//   1. rate-check:    select().from(notifications).where().limit(1)
//   2. content fetch: select().from(workspaces).innerJoin().innerJoin().where().limit(1)
//   3. (happy path)   notification insert via db.insert().values()
//   4. (best-effort)  localeFor: select().from(profiles).where().limit(1)
// We feed select() results from a FIFO queue so each chain can resolve a
// distinct row set; `insertValues` records the notification write.
// vi.mock factories are hoisted above normal `const`s, so the shared mock
// state must live in vi.hoisted() to be referenceable inside the factory.
const { db, selectQueue, insertValues } = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const insertValues = vi.fn();
  function nextSelectResult(): unknown[] {
    return selectQueue.length ? (selectQueue.shift() as unknown[]) : [];
  }
  function makeChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(nextSelectResult()));
    return chain;
  }
  const db = {
    select: vi.fn(() => makeChain()),
    insert: vi.fn(() => ({ values: (...a: unknown[]) => insertValues(...a) })),
  };
  return { db, selectQueue, insertValues };
});
vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({
  notifications: {},
  users: {},
  internships: {},
  workspaces: {},
  profiles: { preferredLanguage: {} },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(() => 'and-clause'),
  eq: vi.fn(() => 'eq-clause'),
  gt: vi.fn(() => 'gt-clause'),
}));

const loadWorkspaceAccess = vi.fn();
vi.mock('@/modules/workspace/access', () => ({
  loadWorkspaceAccess: (...args: unknown[]) => loadWorkspaceAccess(...args),
}));

const sendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/lib/email/templates/nudge', () => ({
  nudgeTemplate: vi.fn(() => ({ subject: 's', text: 't', html: '<p>h</p>' })),
}));

import { sendNudgeAction } from '../nudge-actions';

function setAccess(role: 'intern' | 'company' | 'admin') {
  loadWorkspaceAccess.mockResolvedValue({
    session: { role, user: { id: 'sup1', firstName: 'Sam', lastName: 'B' } },
    workspace: { id: 'w1', internId: 'intern1' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectQueue.length = 0;
});

describe('sendNudgeAction', () => {
  it('forbids an intern from nudging', async () => {
    setAccess('intern');

    const result = await sendNudgeAction('w1', 'ping');

    expect(result).toEqual({ ok: false, error: 'forbidden' });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('rate-limits when a recent nudge already exists', async () => {
    setAccess('company');
    // First select (rate-check) returns an existing nudge row.
    selectQueue.push([{ id: 'notif-recent' }]);

    const result = await sendNudgeAction('w1', 'ping');

    expect(result).toEqual({ ok: false, error: 'rate_limited' });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('happy path: inserts the in-app notification and returns ok', async () => {
    setAccess('company');
    // 1) rate-check -> no recent nudge
    selectQueue.push([]);
    // 2) content fetch -> intern + internship row
    selectQueue.push([
      {
        intern: { id: 'intern1', firstName: 'Lina', email: 'lina@example.com' },
        internship: { title: 'Brand audit' },
      },
    ]);
    // 3) localeFor profile lookup (best-effort email path)
    selectQueue.push([{ pref: 'en' }]);

    const result = await sendNudgeAction('w1', 'Keep going!');

    expect(result).toEqual({ ok: true });
    expect(insertValues).toHaveBeenCalledTimes(1);
    const payload = insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      recipientId: 'intern1',
      type: 'nudge',
      href: '/intern/workspaces/w1',
    });
  });

  it('maps a thrown Forbidden (from loadWorkspaceAccess) to error: forbidden', async () => {
    loadWorkspaceAccess.mockRejectedValueOnce(new Error('Forbidden'));

    const result = await sendNudgeAction('w1', 'ping');

    expect(result).toEqual({ ok: false, error: 'forbidden' });
    expect(insertValues).not.toHaveBeenCalled();
  });
});
