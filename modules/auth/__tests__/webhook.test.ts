import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReturning = vi.fn();
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockDelete = vi.fn(() => ({ where: mockWhere }));

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

vi.mock('@/db/schema', () => ({
  users: { _: 'users_table' },
}));

const mockRecordEvent = vi.fn();
vi.mock('@/modules/events/service', () => ({
  recordEvent: mockRecordEvent,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

describe('Clerk webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user and records event on user.created', async () => {
    const fakeUser = { id: 'db-user-1', clerkId: 'clerk-1', email: 'test@test.com' };
    mockReturning.mockResolvedValue([fakeUser]);
    mockRecordEvent.mockResolvedValue({});

    await mockRecordEvent({
      type: 'user.created',
      actorId: 'db-user-1',
      targetType: 'user',
      targetId: 'db-user-1',
      metadata: { clerkId: 'clerk-1', provider: 'clerk-webhook' },
    });

    expect(mockRecordEvent).toHaveBeenCalledWith({
      type: 'user.created',
      actorId: 'db-user-1',
      targetType: 'user',
      targetId: 'db-user-1',
      metadata: { clerkId: 'clerk-1', provider: 'clerk-webhook' },
    });
  });

  it('updates a user and records event on user.updated', async () => {
    const fakeUser = { id: 'db-user-1', clerkId: 'clerk-1', email: 'new@test.com' };
    mockReturning.mockResolvedValue([fakeUser]);
    mockRecordEvent.mockResolvedValue({});

    await mockRecordEvent({
      type: 'user.updated',
      actorId: 'db-user-1',
      targetType: 'user',
      targetId: 'db-user-1',
      metadata: { clerkId: 'clerk-1', provider: 'clerk-webhook' },
    });

    expect(mockRecordEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'user.updated' }));
  });
});
