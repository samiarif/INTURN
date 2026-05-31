import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable db mock: db.select().from().where().limit() -> Promise<[row]>
const { db, selectResult } = vi.hoisted(() => {
  const selectResult = vi.fn<() => unknown[]>(() => []);
  function makeChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'orderBy']) chain[m] = vi.fn(() => chain);
    chain.limit = vi.fn(() => Promise.resolve(selectResult()));
    return chain;
  }
  return { db: { select: vi.fn(() => makeChain()) }, selectResult };
});
vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({ deliverables: {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));
vi.mock('@/lib/blob', () => ({ assertOurBlobUrl: vi.fn() }));
vi.mock('../service', () => ({
  approveDeliverable: vi.fn(),
  requestRevision: vi.fn(),
  submitDeliverable: vi.fn(),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'fr') }));
vi.mock('@/lib/ratelimit', () => ({ ratelimit: () => ({ limit: () => ({ success: true }) }) }));

const loadWorkspaceAccess = vi.fn();
vi.mock('@/modules/workspace/access', () => ({
  loadWorkspaceAccess: (...a: unknown[]) => loadWorkspaceAccess(...a),
}));

const draftRevisionFeedback = vi.fn();
const gatherFeedbackContext = vi.fn(async () => ({ locale: 'fr' }));
vi.mock('@/modules/pulse/feedback', () => ({
  draftRevisionFeedback: (...a: unknown[]) => (draftRevisionFeedback as (...args: unknown[]) => unknown)(...a),
  gatherFeedbackContext: (...a: unknown[]) => (gatherFeedbackContext as (...args: unknown[]) => unknown)(...a),
}));

import { draftRevisionFeedbackAction } from '../server-actions';

const fakeDeliverable = { id: 'd1', workspaceId: 'w1', title: 'Deck', revisionHistory: [] };

function setAccess(role: 'intern' | 'company' | 'admin') {
  loadWorkspaceAccess.mockResolvedValue({
    session: { role, user: { id: 'u1' } },
    workspace: { id: 'w1', internId: 'i1' },
    project: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectResult.mockReturnValue([fakeDeliverable]);
});

describe('draftRevisionFeedbackAction', () => {
  it('forbids an intern and never calls the engine', async () => {
    setAccess('intern');
    const res = await draftRevisionFeedbackAction({ deliverableId: 'd1' });
    expect(res).toEqual({ ok: false, error: 'forbidden' });
    expect(draftRevisionFeedback).not.toHaveBeenCalled();
  });

  it('returns the drafted text for a supervisor', async () => {
    setAccess('company');
    draftRevisionFeedback.mockResolvedValue({ text: 'Bonjour Arif…', source: 'ai' });
    const res = await draftRevisionFeedbackAction({ deliverableId: 'd1' });
    expect(res).toEqual({ ok: true, text: 'Bonjour Arif…', source: 'ai' });
    expect(gatherFeedbackContext).toHaveBeenCalledOnce();
  });

  it('passes the supervisor draft through to the engine (reformulate)', async () => {
    setAccess('company');
    draftRevisionFeedback.mockResolvedValue({ text: 'polished', source: 'ai' });
    await draftRevisionFeedbackAction({ deliverableId: 'd1', draft: 'rough notes' });
    expect(draftRevisionFeedback).toHaveBeenCalledWith(expect.anything(), { draft: 'rough notes' });
  });
});
