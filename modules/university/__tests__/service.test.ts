import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockRecordEvent = vi.fn().mockResolvedValue({});

  const selectQueue: unknown[][] = [];
  function makeSelectChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    return chain;
  }
  const mockSelect = vi.fn(() => makeSelectChain());

  const mockUpdateWhere = vi.fn(() => Promise.resolve());
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

  const createInvite = vi.fn();

  return { mockReturning, mockValues, mockInsert, mockRecordEvent, selectQueue, mockSelect, mockUpdate, createInvite };
});

vi.mock('@/db', () => ({ db: { insert: mocks.mockInsert, select: mocks.mockSelect, update: mocks.mockUpdate } }));
vi.mock('@/db/schema', () => ({ organizations: { _: 'organizations' }, organizationMembers: {} }));
vi.mock('@/modules/events/service', () => ({ recordEvent: mocks.mockRecordEvent }));
vi.mock('@/modules/team/service', () => ({ createInvite: (...a: unknown[]) => mocks.createInvite(...a) }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and'), inArray: vi.fn(() => 'inArray') }));

import {
  createUniversity,
  assignStudentCoordinator,
  bulkInviteStudents,
  assertStudentInviteManageable,
} from '../service';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockReturning.mockResolvedValue([{ id: 'uni-1', name: 'ESPRIT', kind: 'university' }]);
  mocks.selectQueue.length = 0;
});

describe('createUniversity', () => {
  it('inserts a kind=university org owned by the provisioning admin, verified', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' });

    const values = mocks.mockInsert.mock.results[0]?.value.values;
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'admin-1',
        kind: 'university',
        name: 'ESPRIT',
        city: 'Tunis',
        country: 'TN',
        verified: true,
        verificationStatus: 'verified',
      }),
    );
  });

  it('auto-generates a slug from the name when none is given', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'École Supérieure', city: 'Tunis', country: 'TN' });
    const values = mocks.mockInsert.mock.results[0]?.value.values;
    const arg = values.mock.calls[0][0];
    expect(typeof arg.slug).toBe('string');
    expect(arg.slug.length).toBeGreaterThan(0);
    expect(arg.slug).toMatch(/^[a-z0-9-]+$/); // slugified
  });

  it('uses the provided slug verbatim when given', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'X', slug: 'custom-slug', city: 'T', country: 'TN' });
    const values = mocks.mockInsert.mock.results[0]?.value.values;
    expect(values.mock.calls[0][0].slug).toBe('custom-slug');
  });

  it('records an organization.created event', async () => {
    await createUniversity({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' });
    expect(mocks.mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'organization.created', actorId: 'admin-1', targetId: 'uni-1' }),
    );
  });
});

describe('assignStudentCoordinator', () => {
  it('rejects a student member from another org', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'OTHER', role: 'student' }]);
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: 'c1' }))
      .rejects.toThrow('member_not_found');
  });
  it('rejects a non-student member', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'uni-1', role: 'admin' }]);
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: 'c1' }))
      .rejects.toThrow('member_not_found');
  });
  it('rejects when the target coordinator is not an owner/admin of the org', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'uni-1', role: 'student' }]);
    mocks.selectQueue.push([]); // coordinator lookup: none
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: 'cX' }))
      .rejects.toThrow('coordinator_not_found');
  });
  it('allows clearing the assignment (null)', async () => {
    mocks.selectQueue.push([{ id: 'm1', organizationId: 'uni-1', role: 'student' }]);
    await expect(assignStudentCoordinator({ orgId: 'uni-1', studentMemberId: 'm1', coordinatorUserId: null }))
      .resolves.toBeUndefined();
  });
});

describe('bulkInviteStudents', () => {
  beforeEach(() => {
    mocks.createInvite.mockReset();
    mocks.createInvite.mockImplementation(async ({ email }: { email: string }) => ({
      member: { email },
      token: `tok-${email}`,
    }));
  });

  it('rejects when the target coordinator is not an active owner/admin', async () => {
    mocks.selectQueue.push([]); // coordinator validation: none found
    await expect(
      bulkInviteStudents({
        orgId: 'uni-1',
        rows: [{ email: 'a@x.com', name: null }],
        assignedCoordinatorId: 'cX',
        invitedByUserId: 'u1',
      }),
    ).rejects.toThrow('coordinator_not_found');
  });

  it('invites new rows and skips duplicates (existing + intra-batch)', async () => {
    mocks.selectQueue.push([{ role: 'owner' }]); // coordinator validation OK
    mocks.selectQueue.push([{ email: 'dup@x.com' }]); // existing org members
    const res = await bulkInviteStudents({
      orgId: 'uni-1',
      rows: [
        { email: 'new@x.com', name: 'New' },
        { email: 'DUP@x.com', name: null }, // already a member (case-insensitive)
      ],
      assignedCoordinatorId: 'coord-1',
      invitedByUserId: 'coord-1',
    });
    expect(res.invited).toEqual([{ email: 'new@x.com', token: 'tok-new@x.com' }]);
    expect(res.skippedDuplicate).toEqual(['DUP@x.com']);
    expect(mocks.createInvite).toHaveBeenCalledTimes(1);
    expect(mocks.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'uni-1',
        email: 'new@x.com',
        role: 'student',
        assignedCoordinatorId: 'coord-1',
        invitedByUserId: 'coord-1',
      }),
    );
  });
});

describe('assertStudentInviteManageable', () => {
  it('throws for a non-student / wrong-org / wrong-status member', async () => {
    mocks.selectQueue.push([{ organizationId: 'uni-1', role: 'admin', status: 'active', assignedCoordinatorId: null }]);
    await expect(
      assertStudentInviteManageable({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'owner', viewerUserId: 'o1' }),
    ).rejects.toThrow('member_not_found');
  });
  it('throws when an encadrant targets an invite not assigned to them', async () => {
    mocks.selectQueue.push([{ organizationId: 'uni-1', role: 'student', status: 'invited', assignedCoordinatorId: 'other' }]);
    await expect(
      assertStudentInviteManageable({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'admin', viewerUserId: 'me' }),
    ).rejects.toThrow('member_not_found');
  });
  it('passes for the head on any pending student invite', async () => {
    mocks.selectQueue.push([{ organizationId: 'uni-1', role: 'student', status: 'invited', assignedCoordinatorId: 'whoever' }]);
    await expect(
      assertStudentInviteManageable({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'owner', viewerUserId: 'o1' }),
    ).resolves.toBeUndefined();
  });
  it('passes for an encadrant on their own assigned invite', async () => {
    mocks.selectQueue.push([{ organizationId: 'uni-1', role: 'student', status: 'invited', assignedCoordinatorId: 'me' }]);
    await expect(
      assertStudentInviteManageable({ orgId: 'uni-1', memberId: 'm1', viewerRole: 'admin', viewerUserId: 'me' }),
    ).resolves.toBeUndefined();
  });
});
