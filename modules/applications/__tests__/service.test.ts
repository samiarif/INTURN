import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidApplicationTransition, type ApplicationStatus } from '../service';

// ---------------------------------------------------------------------------
// State-machine unit tests (no DB, no mocks needed)
// ---------------------------------------------------------------------------
describe('application state machine', () => {
  const cases: Array<[ApplicationStatus, ApplicationStatus, boolean]> = [
    ['new', 'reviewed', true],
    ['new', 'rejected', true],
    ['new', 'shortlisted', false],
    ['new', 'accepted', false],
    ['reviewed', 'shortlisted', true],
    ['reviewed', 'rejected', true],
    ['reviewed', 'accepted', false],
    ['reviewed', 'new', false],
    ['shortlisted', 'interview', true],
    ['shortlisted', 'accepted', true],
    ['shortlisted', 'rejected', true],
    ['shortlisted', 'reviewed', false],
    ['interview', 'accepted', true],
    ['interview', 'rejected', true],
    ['interview', 'shortlisted', false],
    ['accepted', 'rejected', false],
    ['accepted', 'interview', false],
    ['rejected', 'reviewed', false],
    ['rejected', 'accepted', false],
  ];
  for (const [from, to, expected] of cases) {
    it(`${from} → ${to} ${expected ? 'allowed' : 'denied'}`, () => {
      expect(isValidApplicationTransition(from, to)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// acceptApplication — write-order invariant tests
//
// INVARIANT: db.insert(workspaces) MUST be called BEFORE db.update(applications).
// This ordering is what makes acceptApplication crash-safe: a process crash
// between the two writes leaves the application still 'pending' (safe to retry)
// rather than 'accepted' with no workspace.  A test regression here means the
// ordering was accidentally reversed, reintroducing the "accepted with no
// workspace" risk.
// ---------------------------------------------------------------------------

// vi.hoisted so the shared mutable state is available inside vi.mock factories
// (which are hoisted above all imports by Vitest).
const mocks = vi.hoisted(() => {
  // Ordered call log — every db operation appends its name here.
  const callOrder: string[] = [];

  // ---- select chain -------------------------------------------------------
  // acceptApplication issues four selects in sequence:
  //   1. select application by id
  //   2. select internship by id
  //   3. select existing workspace (idempotency guard)
  // We queue up the return values in selectQueue and pop them FIFO.
  const selectQueue: unknown[][] = [];

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

  // ---- insert chain -------------------------------------------------------
  const insertReturning = vi.fn(() => {
    callOrder.push('insert:workspaces');
    return Promise.resolve([{ id: 'ws1', internId: 'i1', internshipId: 'int1' }]);
  });

  // ---- update chain -------------------------------------------------------
  // Captures every .set() payload so tests can assert decisionNote is persisted in
  // the SAME update that flips status. .where() returns a thenable that ALSO exposes
  // .returning() — transitionApplicationStatus awaits .returning(); acceptApplication
  // awaits .where() directly. Both resolve to the same updated-row stub.
  const updateSets: Array<Record<string, unknown>> = [];
  const updatedRows = [{ id: 'app1', status: 'updated', decisionNote: null }];
  function makeUpdateWhereResult() {
    return {
      then: (f: (v: unknown) => unknown, r?: (e: unknown) => unknown) =>
        Promise.resolve(updatedRows).then(f, r),
      returning: vi.fn(() => Promise.resolve(updatedRows)),
    };
  }
  const updateWhere = vi.fn(() => {
    callOrder.push('update:applications');
    return makeUpdateWhereResult();
  });

  const db = {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: insertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        updateSets.push(payload);
        return { where: updateWhere };
      }),
    })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  };

  return { db, callOrder, selectQueue, insertReturning, updateWhere, updateSets };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  applications: {},
  internships: {},
  workspaces: {},
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and') }));

// recordEvent is called after the two critical writes; stub it AND log its call
// order so the "decisionNote UPDATE lands before the event fires" invariant is
// testable.
vi.mock('@/modules/events/service', () => ({
  recordEvent: vi.fn(async () => {
    mocks.callOrder.push('recordEvent');
    return {};
  }),
}));

import { acceptApplication, transitionApplicationStatus } from '../service';

const fakeApplication = {
  id: 'app1',
  applicantId: 'i1',
  internshipId: 'int1',
  status: 'shortlisted',
};
const fakeInternship = {
  id: 'int1',
  organizationId: 'org1',
  duration: 12,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callOrder.length = 0;
  mocks.selectQueue.length = 0;
  mocks.updateSets.length = 0;
});

describe('acceptApplication — write-order invariant', () => {
  it('calls insert(workspaces) BEFORE update(applications) on the happy path', async () => {
    // Queue: application, internship, no existing workspace
    mocks.selectQueue.push([fakeApplication], [fakeInternship], []);

    await acceptApplication({ applicationId: 'app1', actorId: 'actor1' });

    const insertIdx = mocks.callOrder.indexOf('insert:workspaces');
    const updateIdx = mocks.callOrder.indexOf('update:applications');

    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect(updateIdx).toBeGreaterThanOrEqual(0);
    expect(insertIdx).toBeLessThan(updateIdx);
  });

  it('does NOT call insert(workspaces) on the idempotency path (existing workspace)', async () => {
    const existingWorkspace = { id: 'ws-existing', internId: 'i1', internshipId: 'int1' };
    // Queue: application, internship, existing workspace found
    mocks.selectQueue.push([fakeApplication], [fakeInternship], [existingWorkspace]);

    await acceptApplication({ applicationId: 'app1', actorId: 'actor1' });

    // Workspace insert must NOT have been called
    expect(mocks.callOrder).not.toContain('insert:workspaces');
    // Application status update MUST still have been called
    expect(mocks.callOrder).toContain('update:applications');
  });

  it('rejects when the application does not exist', async () => {
    mocks.selectQueue.push([]); // no application found

    await expect(
      acceptApplication({ applicationId: 'missing', actorId: 'actor1' }),
    ).rejects.toThrow('Application not found');

    expect(mocks.callOrder).not.toContain('insert:workspaces');
    expect(mocks.callOrder).not.toContain('update:applications');
  });

  it('rejects when the transition is invalid (e.g. already accepted)', async () => {
    mocks.selectQueue.push([{ ...fakeApplication, status: 'accepted' }]);

    await expect(
      acceptApplication({ applicationId: 'app1', actorId: 'actor1' }),
    ).rejects.toThrow('Cannot accept from status accepted');

    expect(mocks.callOrder).not.toContain('insert:workspaces');
    expect(mocks.callOrder).not.toContain('update:applications');
  });
});

describe('decisionNote persistence (applicant-facing feedback)', () => {
  it('transitionApplicationStatus writes decisionNote in the same UPDATE as status, before the event', async () => {
    mocks.selectQueue.push([{ ...fakeApplication, status: 'shortlisted' }]);

    await transitionApplicationStatus({
      applicationId: 'app1',
      to: 'rejected',
      actorId: 'actor1',
      decisionNote: 'Strong portfolio — not a fit this round.',
    });

    expect(mocks.updateSets).toHaveLength(1);
    expect(mocks.updateSets[0]).toMatchObject({
      status: 'rejected',
      decisionNote: 'Strong portfolio — not a fit this round.',
    });
    // Ordering invariant: the note-bearing UPDATE lands BEFORE recordEvent fires.
    expect(mocks.callOrder.indexOf('update:applications')).toBeLessThan(
      mocks.callOrder.indexOf('recordEvent'),
    );
  });

  it('transitionApplicationStatus omits decisionNote from the UPDATE when none is given', async () => {
    mocks.selectQueue.push([{ ...fakeApplication, status: 'reviewed' }]);

    await transitionApplicationStatus({
      applicationId: 'app1',
      to: 'shortlisted',
      actorId: 'actor1',
    });

    expect(mocks.updateSets).toHaveLength(1);
    expect(mocks.updateSets[0]).not.toHaveProperty('decisionNote');
    expect(mocks.updateSets[0]).toMatchObject({ status: 'shortlisted' });
  });

  it('acceptApplication persists decisionNote in the status UPDATE', async () => {
    mocks.selectQueue.push([fakeApplication], [fakeInternship], []);

    await acceptApplication({
      applicationId: 'app1',
      actorId: 'actor1',
      decisionNote: 'Welcome aboard!',
    });

    const acceptedSet = mocks.updateSets.find((s) => s.status === 'accepted');
    expect(acceptedSet).toBeDefined();
    expect(acceptedSet).toMatchObject({ status: 'accepted', decisionNote: 'Welcome aboard!' });
  });

  it('acceptApplication trims a whitespace-only note to undefined (stored NULL)', async () => {
    mocks.selectQueue.push([fakeApplication], [fakeInternship], []);

    await acceptApplication({
      applicationId: 'app1',
      actorId: 'actor1',
      decisionNote: '   ',
    });

    const acceptedSet = mocks.updateSets.find((s) => s.status === 'accepted');
    expect(acceptedSet).toBeDefined();
    expect(acceptedSet).not.toHaveProperty('decisionNote');
  });
});
