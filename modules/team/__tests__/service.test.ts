import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted — mutable state shared across vi.mock factories (hoisted above
// all imports by Vitest). Mirror the exact idiom from applications/__tests__.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const callOrder: string[] = [];

  // FIFO queue for .select().from().where()?.limit() chains
  const selectQueue: unknown[][] = [];

  // Track every update call for order verification
  const updateWhereReturning = vi.fn(() => {
    callOrder.push('update');
    return Promise.resolve([]);
  });

  // Some updates don't call .returning(); provide both shapes
  const updateWhere = vi.fn(() => ({
    returning: updateWhereReturning,
    // allow bare .where() without .returning()
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
        id: 'member-1',
        organizationId: 'org-1',
        userId: null,
        email: 'test@example.com',
        role: 'admin',
        status: 'invited',
        pendingProjectIds: [],
        inviteToken: 'tok',
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedByUserId: 'user-1',
        invitedAt: new Date(),
        joinedAt: null,
        removedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  const db = {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: insertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: updateWhere })),
    })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  };

  return { db, callOrder, selectQueue, insertReturning, updateWhere, updateWhereReturning };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  organizationMembers: { id: 'om_id' },
  projects: { id: 'p_id' },
  users: { id: 'u_id' },
  organizations: { id: 'org_id' },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
  inArray: vi.fn(() => 'inArray'),
  sql: Object.assign(vi.fn(() => 'sql'), {
    raw: vi.fn(() => 'sql.raw'),
  }),
}));

// crypto.randomBytes is real — no need to mock; tests verify token format
// via the inserted row data from the mock queue.

// ---------------------------------------------------------------------------
// Import service AFTER mocks are set up
// ---------------------------------------------------------------------------
import {
  createInvite,
  acceptInvite,
  revokeInvite,
  resendInvite,
  removeMember,
  setMemberRole,
  setSupervisorProjects,
} from '../service';

// Helpers
type PartialMember = {
  id: string;
  organizationId: string;
  userId: string | null;
  email: string;
  role: string;
  status: string;
  pendingProjectIds: string[];
  inviteToken: string | null;
  inviteExpiresAt: Date | null;
  invitedByUserId: string;
  invitedAt: Date;
  joinedAt: Date | null;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function makeMember(overrides: Partial<PartialMember> = {}): PartialMember {
  return {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    email: 'alice@example.com',
    role: 'admin',
    status: 'invited',
    pendingProjectIds: [],
    inviteToken: 'tok123',
    inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    invitedByUserId: 'inviter-1',
    invitedAt: new Date(),
    joinedAt: null,
    removedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callOrder.length = 0;
  mocks.selectQueue.length = 0;
});

// ---------------------------------------------------------------------------
// createInvite
// ---------------------------------------------------------------------------
describe('createInvite', () => {
  it('inserts an invited row and returns { member, token }', async () => {
    // select: no existing user by email
    mocks.selectQueue.push([]);

    const fakeInserted = {
      id: 'member-1',
      organizationId: 'org-1',
      userId: null,
      email: 'new@example.com',
      role: 'admin' as const,
      status: 'invited' as const,
      pendingProjectIds: ['p1'],
      inviteToken: 'sometoken',
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedByUserId: 'user-1',
      invitedAt: new Date(),
      joinedAt: null,
      removedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mocks.insertReturning.mockResolvedValueOnce([fakeInserted] as unknown as never);

    const result = await createInvite({
      orgId: 'org-1',
      email: 'new@example.com',
      role: 'admin',
      projectIds: ['p1'],
      invitedByUserId: 'user-1',
    });

    expect(result.member).toMatchObject({ status: 'invited', role: 'admin' });
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(10);
    // insert must have been called
    expect(mocks.db.insert).toHaveBeenCalled();
  });

  it('pre-links userId when a user with matching email is found', async () => {
    const existingUser = { id: 'existing-user-id', email: 'alice@example.com' };
    mocks.selectQueue.push([existingUser]);

    const fakeInserted = {
      ...makeMember({ userId: 'existing-user-id', email: 'alice@example.com', status: 'invited' }),
    };
    mocks.insertReturning.mockResolvedValueOnce([fakeInserted] as unknown as never);

    const result = await createInvite({
      orgId: 'org-1',
      email: 'alice@example.com',
      role: 'supervisor',
      invitedByUserId: 'user-1',
    });

    // The insert values call should receive userId from the found user
    const insertValues = mocks.db.insert.mock.results[0]?.value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'existing-user-id' }),
    );
    expect(result.member.userId).toBe('existing-user-id');
  });

  it('generates a token ~32 chars (base64url from 24 bytes)', async () => {
    mocks.selectQueue.push([]);
    mocks.insertReturning.mockResolvedValueOnce([makeMember({ status: 'invited' })] as unknown as never);

    const { token } = await createInvite({
      orgId: 'org-1',
      email: 'x@example.com',
      role: 'admin',
      invitedByUserId: 'u1',
    });
    // base64url from 24 bytes = 32 chars (no padding)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------
describe('acceptInvite', () => {
  it('returns not_found when token has no row', async () => {
    mocks.selectQueue.push([]); // no member found

    const result = await acceptInvite({
      token: 'bad-token',
      userId: 'u1',
      userEmail: 'x@example.com',
    });

    expect(result).toEqual({ ok: false, reason: 'not_found' });
    expect(mocks.callOrder).not.toContain('update');
  });

  it('returns expired when inviteExpiresAt is in the past', async () => {
    const expiredMember = makeMember({
      status: 'invited',
      inviteExpiresAt: new Date(Date.now() - 1000),
      email: 'alice@example.com',
    });
    mocks.selectQueue.push([expiredMember]);

    const result = await acceptInvite({
      token: 'tok123',
      userId: 'u1',
      userEmail: 'alice@example.com',
    });

    expect(result).toEqual({ ok: false, reason: 'expired' });
    expect(mocks.callOrder).not.toContain('update');
  });

  it('returns email_mismatch when userEmail does not match invite email', async () => {
    const member = makeMember({
      status: 'invited',
      email: 'alice@example.com',
      inviteExpiresAt: new Date(Date.now() + 3600_000),
    });
    mocks.selectQueue.push([member]);

    const result = await acceptInvite({
      token: 'tok123',
      userId: 'u1',
      userEmail: 'other@example.com',
    });

    expect(result).toEqual({ ok: false, reason: 'email_mismatch' });
  });

  it('returns already_member when status is already active', async () => {
    const member = makeMember({
      status: 'active',
      email: 'alice@example.com',
      inviteExpiresAt: new Date(Date.now() + 3600_000),
    });
    mocks.selectQueue.push([member]);

    const result = await acceptInvite({
      token: 'tok123',
      userId: 'user-1',
      userEmail: 'alice@example.com',
    });

    expect(result).toEqual({ ok: false, reason: 'already_member' });
  });

  it('flips to active and returns { ok: true, orgId } on happy path', async () => {
    const member = makeMember({
      status: 'invited',
      email: 'alice@example.com',
      inviteExpiresAt: new Date(Date.now() + 3600_000),
      pendingProjectIds: [],
    });
    mocks.selectQueue.push([member]);

    const result = await acceptInvite({
      token: 'tok123',
      userId: 'new-user-id',
      userEmail: 'alice@example.com',
    });

    expect(result).toEqual({ ok: true, orgId: 'org-1' });
    expect(mocks.callOrder).toContain('update');
    // update set should contain active status
    const updateSet = mocks.db.update.mock.results[0]?.value.set;
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', userId: 'new-user-id' }),
    );
  });

  it('updates project supervisorIds for each pendingProjectId on accept', async () => {
    const member = makeMember({
      status: 'invited',
      email: 'alice@example.com',
      inviteExpiresAt: new Date(Date.now() + 3600_000),
      pendingProjectIds: ['proj-1', 'proj-2'],
    });
    mocks.selectQueue.push([member]);
    // For each project: select to get current supervisorIds
    mocks.selectQueue.push([{ id: 'proj-1', supervisorIds: ['existing-user'] }]);
    mocks.selectQueue.push([{ id: 'proj-2', supervisorIds: [] }]);

    const result = await acceptInvite({
      token: 'tok123',
      userId: 'new-user-id',
      userEmail: 'alice@example.com',
    });

    expect(result).toMatchObject({ ok: true });
    // 1 member update + 2 project updates
    expect(mocks.db.update).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// revokeInvite
// ---------------------------------------------------------------------------
describe('revokeInvite', () => {
  it('sets status to removed', async () => {
    await revokeInvite({ memberId: 'member-1' });
    const updateSet = mocks.db.update.mock.results[0]?.value.set;
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'removed' }),
    );
  });
});

// ---------------------------------------------------------------------------
// resendInvite
// ---------------------------------------------------------------------------
describe('resendInvite', () => {
  it('generates a new token and updates the row', async () => {
    mocks.selectQueue.push([makeMember({ status: 'invited' })]);
    const { token } = await resendInvite({ memberId: 'member-1' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(mocks.callOrder).toContain('update');
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------
describe('removeMember', () => {
  it('sets status to removed and removedAt', async () => {
    mocks.selectQueue.push([
      makeMember({ status: 'active', userId: 'user-1', organizationId: 'org-1' }),
    ]);
    // select org projects with supervisorIds
    mocks.selectQueue.push([]); // no projects to patch

    await removeMember({ memberId: 'member-1' });

    const updateSet = mocks.db.update.mock.results[0]?.value.set;
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'removed' }),
    );
  });

  it('strips userId from project supervisorIds if present', async () => {
    mocks.selectQueue.push([
      makeMember({ status: 'active', userId: 'user-1', organizationId: 'org-1' }),
    ]);
    // Org projects with supervisorIds containing user-1
    mocks.selectQueue.push([
      { id: 'proj-1', supervisorIds: ['user-1', 'user-2'] },
      { id: 'proj-2', supervisorIds: ['user-1'] },
    ]);

    await removeMember({ memberId: 'member-1' });

    // 1 member update + 2 project updates
    expect(mocks.db.update).toHaveBeenCalledTimes(3);
  });

  it('skips project updates if member has no userId', async () => {
    mocks.selectQueue.push([
      makeMember({ status: 'invited', userId: null, organizationId: 'org-1' }),
    ]);

    await removeMember({ memberId: 'member-1' });

    // only the member update
    expect(mocks.db.update).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// setMemberRole
// ---------------------------------------------------------------------------
describe('setMemberRole', () => {
  it('throws cannot_change_owner when target member is owner', async () => {
    mocks.selectQueue.push([makeMember({ role: 'owner' })]);

    await expect(
      setMemberRole({ memberId: 'member-1', role: 'admin' }),
    ).rejects.toThrow('cannot_change_owner');

    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it('updates role when member is admin', async () => {
    mocks.selectQueue.push([makeMember({ role: 'admin' })]);

    await setMemberRole({ memberId: 'member-1', role: 'supervisor' });

    const updateSet = mocks.db.update.mock.results[0]?.value.set;
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'supervisor' }),
    );
  });

  it('throws member_not_found when no row found', async () => {
    mocks.selectQueue.push([]);

    await expect(
      setMemberRole({ memberId: 'missing', role: 'admin' }),
    ).rejects.toThrow('member_not_found');
  });
});

// ---------------------------------------------------------------------------
// setSupervisorProjects
// ---------------------------------------------------------------------------
describe('setSupervisorProjects', () => {
  it('adds userId to projectIds and removes from others', async () => {
    // Org projects
    const orgProjects = [
      { id: 'proj-1', supervisorIds: [] },
      { id: 'proj-2', supervisorIds: ['user-1'] },
      { id: 'proj-3', supervisorIds: ['user-1', 'user-2'] },
    ];
    // makeSelectChain().from().where() returns the full array via limit
    mocks.selectQueue.push(orgProjects);

    await setSupervisorProjects({
      orgId: 'org-1',
      userId: 'user-1',
      projectIds: ['proj-1', 'proj-2'], // add to proj-1, keep in proj-2, remove from proj-3
    });

    // proj-1: add → update
    // proj-2: already has user-1, idempotent → no update (or update is still safe)
    // proj-3: remove user-1 → update
    expect(mocks.db.update).toHaveBeenCalledTimes(2); // proj-1 add, proj-3 remove
  });
});
