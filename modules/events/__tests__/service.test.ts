import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReturning, mockValues, mockInsert } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  return { mockReturning, mockValues, mockInsert };
});

vi.mock('@/db', () => ({
  db: { insert: mockInsert },
}));

vi.mock('@/db/schema', () => ({
  events: { _: 'events_table' },
}));

import { recordEvent } from '../service';

describe('recordEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts an event with all fields and returns it', async () => {
    const fakeEvent = {
      id: 'evt-1',
      type: 'auth.signup',
      actorId: 'user-1',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { provider: 'email' },
      createdAt: new Date(),
    };
    mockReturning.mockResolvedValue([fakeEvent]);

    const result = await recordEvent({
      type: 'auth.signup',
      actorId: 'user-1',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { provider: 'email' },
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      type: 'auth.signup',
      actorId: 'user-1',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { provider: 'email' },
    });
    expect(result).toEqual(fakeEvent);
  });

  it('inserts an event with only required fields', async () => {
    const fakeEvent = {
      id: 'evt-2',
      type: 'auth.login',
      actorId: undefined,
      targetType: undefined,
      targetId: undefined,
      metadata: undefined,
      createdAt: new Date(),
    };
    mockReturning.mockResolvedValue([fakeEvent]);

    const result = await recordEvent({ type: 'auth.login' });

    expect(mockValues).toHaveBeenCalledWith({
      type: 'auth.login',
      actorId: undefined,
      targetType: undefined,
      targetId: undefined,
      metadata: undefined,
    });
    expect(result).toEqual(fakeEvent);
  });
});
