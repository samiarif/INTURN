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

  return { mockReturning, mockValues, mockInsert, mockRecordEvent, selectQueue, mockSelect, mockUpdate };
});

vi.mock('@/db', () => ({ db: { insert: mocks.mockInsert, select: mocks.mockSelect, update: mocks.mockUpdate } }));
vi.mock('@/db/schema', () => ({ organizations: { _: 'organizations' }, organizationMembers: {} }));
vi.mock('@/modules/events/service', () => ({ recordEvent: mocks.mockRecordEvent }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and') }));

import { createUniversity, assignStudentCoordinator } from '../service';

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
