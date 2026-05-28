import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Service-level tests for submitDeliverable / approveDeliverable /
// requestRevision. These exercise the bookkeeping the pure resolver
// (nextDeliverableState) does NOT own: the version persisted on resubmit, the
// revision-history snapshot push, and feedback clearing — all against a mocked
// db so no infra is touched.
//
// db.select(...).limit() returns the current deliverable row from a FIFO queue;
// db.update(...).returning() echoes back the values that were `set()` merged
// onto the current row so we can assert the persisted payload.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const updateSet = vi.fn();

  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }

  const db = {
    select: vi.fn(() => makeSelectChain()),
    update: vi.fn(() => ({
      set: (vals: Record<string, unknown>) => {
        updateSet(vals);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'd1', ...vals }])),
          })),
        };
      },
    })),
  };

  return { db, selectQueue, updateSet };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({ deliverables: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));
vi.mock('@/modules/events/service', () => ({ recordEvent: vi.fn().mockResolvedValue({}) }));

import { submitDeliverable, approveDeliverable, requestRevision } from '../service';

function baseDeliverable(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    title: 'Brand audit deck',
    status: 'draft',
    version: 1,
    fileUrl: null,
    fileName: null,
    fileType: null,
    feedback: null,
    submittedAt: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    revisionHistory: [],
    ...overrides,
  };
}

const submitInput = {
  deliverableId: 'd1',
  fileUrl: 'https://blob/v.pdf',
  fileName: 'v.pdf',
  fileType: 'application/pdf',
  actorId: 'intern1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('submitDeliverable', () => {
  it('draft → submitted keeps version 1 and pushes NO history (first submission)', async () => {
    mocks.selectQueue.push([baseDeliverable({ status: 'draft', version: 1 })]);

    const result = await submitDeliverable(submitInput);

    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('submitted');
    expect(persisted.version).toBe(1);
    expect(persisted.revisionHistory).toEqual([]); // no ghost v1 snapshot
    expect(result.status).toBe('submitted');
  });

  it('revision-requested → submitted increments version and snapshots the prior version', async () => {
    mocks.selectQueue.push([
      baseDeliverable({
        status: 'revision-requested',
        version: 1,
        fileUrl: 'https://blob/old.pdf',
        fileName: 'old.pdf',
        fileType: 'application/pdf',
        feedback: 'Tighten the exec summary',
        revisionHistory: [],
      }),
    ]);

    await submitDeliverable(submitInput);

    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.version).toBe(2); // bumped
    expect(persisted.feedback).toBeNull(); // stale feedback cleared

    const history = persisted.revisionHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      version: 1,
      status: 'revision-requested',
      fileUrl: 'https://blob/old.pdf',
    });
    // Prior feedback is encoded as an inline review entry on the snapshot.
    expect(history[0].review).toMatchObject({ state: 'changes', text: 'Tighten the exec summary' });
  });

  it('prepends new snapshots so history stays newest-first', async () => {
    const olderSnapshot = { version: 1, status: 'revision-requested', fileUrl: 'v1.pdf' };
    mocks.selectQueue.push([
      baseDeliverable({
        status: 'revision-requested',
        version: 2,
        revisionHistory: [olderSnapshot],
      }),
    ]);

    await submitDeliverable(submitInput);

    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    const history = persisted.revisionHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(2); // freshly snapshotted, on top
    expect(history[1]).toEqual(olderSnapshot); // previous entries preserved below
  });

  it('rejects an invalid transition (submitted → submit) and never writes', async () => {
    mocks.selectQueue.push([baseDeliverable({ status: 'submitted', version: 1 })]);

    await expect(submitDeliverable(submitInput)).rejects.toThrow('Cannot submit from status submitted');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it('rejects when the deliverable does not exist', async () => {
    mocks.selectQueue.push([]); // not found

    await expect(submitDeliverable(submitInput)).rejects.toThrow('Deliverable not found');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('approveDeliverable', () => {
  it('submitted → approved persists status approved', async () => {
    mocks.selectQueue.push([baseDeliverable({ status: 'submitted', version: 2 })]);

    await approveDeliverable({ deliverableId: 'd1', actorId: 'sup1' });

    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('approved');
  });

  it('rejects approving a draft (must be submitted first)', async () => {
    mocks.selectQueue.push([baseDeliverable({ status: 'draft' })]);

    await expect(
      approveDeliverable({ deliverableId: 'd1', actorId: 'sup1' }),
    ).rejects.toThrow('Cannot approve from status draft');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it('rejects approving an already-approved (terminal) deliverable', async () => {
    mocks.selectQueue.push([baseDeliverable({ status: 'approved' })]);

    await expect(
      approveDeliverable({ deliverableId: 'd1', actorId: 'sup1' }),
    ).rejects.toThrow('Cannot approve from status approved');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('requestRevision', () => {
  it('submitted → revision-requested persists status + feedback', async () => {
    mocks.selectQueue.push([baseDeliverable({ status: 'submitted', version: 1 })]);

    await requestRevision({ deliverableId: 'd1', feedback: 'Needs sources', actorId: 'sup1' });

    const persisted = mocks.updateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted.status).toBe('revision-requested');
    expect(persisted.feedback).toBe('Needs sources');
  });

  it('rejects requesting revision on a draft', async () => {
    mocks.selectQueue.push([baseDeliverable({ status: 'draft' })]);

    await expect(
      requestRevision({ deliverableId: 'd1', feedback: 'x', actorId: 'sup1' }),
    ).rejects.toThrow('Cannot request-revision from status draft');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});
