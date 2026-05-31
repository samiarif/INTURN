import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db, updateWhere, insertReturning } = vi.hoisted(() => {
  const updateWhere = vi.fn();
  const insertReturning = vi.fn(() => Promise.resolve([{ id: 'NEW' }]));
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([{ id: 'WS', internshipId: 'I', internId: 'U', organizationId: 'O' }]),
        }),
      }),
    }),
    insert: () => ({ values: () => ({ returning: () => insertReturning() }) }),
    update: () => ({ set: () => ({ where: (...a: unknown[]) => updateWhere(...a) }) }),
  };
  return { db, updateWhere, insertReturning };
});
vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({ internshipRecords: {}, workspaces: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));

const buildRecordSnapshot = vi.fn();
const findActiveRecordByWorkspace = vi.fn();
vi.mock('../queries', () => ({
  buildRecordSnapshot: (...a: unknown[]) => buildRecordSnapshot(...a),
  findActiveRecordByWorkspace: (...a: unknown[]) => findActiveRecordByWorkspace(...a),
}));

import { issueRecord } from '../service';

const input = {
  workspaceId: 'WS',
  supervisorId: 'S',
  reviewText: 'great work',
  rating: 4,
  locale: 'fr' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  insertReturning.mockResolvedValue([{ id: 'NEW' }]);
  buildRecordSnapshot.mockResolvedValue({ ok: true });
});

describe('issueRecord — never lose the credential', () => {
  it('does NOT revoke the existing record when snapshot-building fails', async () => {
    findActiveRecordByWorkspace.mockResolvedValue({ id: 'OLD' });
    buildRecordSnapshot.mockRejectedValue(new Error('snapshot boom'));

    await expect(issueRecord(input)).rejects.toThrow('snapshot boom');
    expect(updateWhere).not.toHaveBeenCalled(); // old credential still valid
  });

  it('inserts the new record before revoking the old one', async () => {
    findActiveRecordByWorkspace.mockResolvedValue({ id: 'OLD' });
    const order: string[] = [];
    insertReturning.mockImplementation(() => {
      order.push('insert');
      return Promise.resolve([{ id: 'NEW' }]);
    });
    updateWhere.mockImplementation(() => {
      order.push('revoke');
    });

    await issueRecord(input);
    expect(order).toEqual(['insert', 'revoke']);
  });
});
