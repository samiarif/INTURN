import { describe, it, expect, vi, beforeEach } from 'vitest';

const { selectWhere, updateWhere, insertReturning, mockRecordEvent, andSpy, eqSpy } = vi.hoisted(() => {
  const selectWhere = vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) }));
  const updateWhere = vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'co-1' }])) }));
  const insertReturning = vi.fn(() => Promise.resolve([{ id: 'co-1' }]));
  const mockRecordEvent = vi.fn().mockResolvedValue({});
  const andSpy = vi.fn((...args: unknown[]) => ({ __and: args }));
  const eqSpy = vi.fn((col: unknown, val: unknown) => ({ __eq: [col, val] }));
  return { selectWhere, updateWhere, insertReturning, mockRecordEvent, andSpy, eqSpy };
});

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhere })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: insertReturning })) })),
  },
}));
vi.mock('@/db/schema', () => ({ organizations: { ownerId: 'owner_col', kind: 'kind_col' } }));
vi.mock('@/modules/events/service', () => ({ recordEvent: mockRecordEvent }));
vi.mock('drizzle-orm', () => ({ and: andSpy, eq: eqSpy }));

import { createOrUpdateCompanyProfile } from '../company-service';

beforeEach(() => vi.clearAllMocks());

const input = {
  name: 'Acme', industry: 'Tech', size: '11-50', country: 'TN', city: 'Tunis',
  description: 'd', website: '', logoUrl: null, rneUrl: null,
} as never;

describe('createOrUpdateCompanyProfile — kind scoping', () => {
  it('scopes the ownerId lookup by kind=company (insert path)', async () => {
    await createOrUpdateCompanyProfile('user-1', input);
    // The where clause is an AND of ownerId + kind='company'.
    expect(andSpy).toHaveBeenCalled();
    expect(eqSpy).toHaveBeenCalledWith('kind_col', 'company');
  });
});
