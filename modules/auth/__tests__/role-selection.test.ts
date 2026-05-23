import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReturning, mockInsert, mockUpdate, mockSelectWhere, mockSelect, mockRecordEvent } =
  vi.hoisted(() => {
    const mockReturning = vi.fn();
    const mockWhere = vi.fn(() => ({ returning: mockReturning }));
    const mockSet = vi.fn(() => ({ where: mockWhere }));
    const mockValues = vi.fn(() => ({ returning: mockReturning }));
    const mockInsert = vi.fn(() => ({ values: mockValues }));
    const mockUpdate = vi.fn(() => ({ set: mockSet }));
    const mockSelectWhere = vi.fn();
    const mockFrom = vi.fn(() => ({ where: mockSelectWhere }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    const mockRecordEvent = vi.fn().mockResolvedValue({});
    return {
      mockReturning,
      mockWhere,
      mockSet,
      mockValues,
      mockInsert,
      mockUpdate,
      mockSelectWhere,
      mockFrom,
      mockSelect,
      mockRecordEvent,
    };
  });

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}));

vi.mock('@/db/schema', () => ({
  users: { _: 'users_table' },
  profiles: { _: 'profiles_table' },
  organizations: { _: 'organizations_table' },
}));

vi.mock('@/modules/events/service', () => ({
  recordEvent: mockRecordEvent,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { selectRole } from '../role-selection';

describe('selectRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid roles', async () => {
    const result = await selectRole('user-1', 'superadmin');
    expect(result).toEqual({ success: false, error: 'Invalid role' });
  });

  it('rejects if user not found', async () => {
    mockSelectWhere.mockResolvedValue([]);
    const result = await selectRole('user-1', 'intern');
    expect(result).toEqual({ success: false, error: 'User not found' });
  });

  it('rejects if role already selected', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'user-1', role: 'intern' }]);
    const result = await selectRole('user-1', 'company');
    expect(result).toEqual({ success: false, error: 'Role already selected' });
  });

  it('sets intern role and creates profile', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'db-1', clerkId: 'user-1', role: null }]);
    mockReturning.mockResolvedValue([{ id: 'db-1', role: 'intern' }]);
    const result = await selectRole('user-1', 'intern');
    expect(result).toEqual({ success: true, role: 'intern' });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'role.selected', metadata: { role: 'intern' } }),
    );
  });

  it('sets company role and creates placeholder organization', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'db-1', clerkId: 'user-1', role: null }]);
    mockReturning.mockResolvedValue([{ id: 'db-1', role: 'company' }]);
    const result = await selectRole('user-1', 'company');
    expect(result).toEqual({ success: true, role: 'company' });
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'role.selected', metadata: { role: 'company' } }),
    );
  });
});
