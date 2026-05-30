import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports so vi.hoisted runs first.
// ---------------------------------------------------------------------------

const requireAdmin = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireAdmin: (...a: unknown[]) => requireAdmin(...a),
}));

const recordAuditLog = vi.fn().mockResolvedValue({});
vi.mock('@/modules/audit/service', () => ({
  recordAuditLog: (...a: unknown[]) => recordAuditLog(...a),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: { updateUser: vi.fn().mockResolvedValue({}) },
  }),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
}));

// DB mock: select queue feeds rows one call at a time; update spy captures what was set.
const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const updateSet = vi.fn();

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: (vals: Record<string, unknown>) => {
        updateSet(vals);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'u1', ...vals }])),
          })),
        };
      },
    })),
  };

  return { db, selectQueue, updateSet };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({ users: {} }));

// ---------------------------------------------------------------------------
// Import after mocks are wired.
// ---------------------------------------------------------------------------
import { setUserRoleAction } from '../server-actions';

function adminSession() {
  return { user: { id: 'admin1', role: 'admin' }, role: 'admin' };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

// ---------------------------------------------------------------------------
// setUserRoleAction — university coordinator guard (primary Task 11 case)
// ---------------------------------------------------------------------------
describe('setUserRoleAction — university coordinator guard', () => {
  it('refuses to change a user whose current role is university', async () => {
    requireAdmin.mockResolvedValue(adminSession());
    mocks.selectQueue.push([
      { id: 'coord1', role: 'university', email: 'coord@enit.tn', clerkId: 'clerk_coord1' },
    ]);

    await expect(
      setUserRoleAction({ userId: 'coord1', role: 'intern' }),
    ).rejects.toThrow('Cannot change a university coordinator role via this UI');

    // Must NOT have written anything to the DB.
    expect(mocks.updateSet).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setUserRoleAction — existing guards still work
// ---------------------------------------------------------------------------
describe('setUserRoleAction — self-change guard', () => {
  it('refuses to change the calling admin own role', async () => {
    requireAdmin.mockResolvedValue(adminSession());
    await expect(
      setUserRoleAction({ userId: 'admin1', role: 'intern' }),
    ).rejects.toThrow('Cannot change your own role');
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('setUserRoleAction — happy path (non-university target)', () => {
  it('updates the role and records an audit log when the target is a regular intern', async () => {
    requireAdmin.mockResolvedValue(adminSession());
    mocks.selectQueue.push([
      { id: 'intern1', role: 'intern', email: 'intern@test.com', clerkId: 'clerk_intern1' },
    ]);

    const result = await setUserRoleAction({ userId: 'intern1', role: 'company' });

    expect(result).toEqual({ ok: true, role: 'company' });
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'company' }),
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.role_changed', targetId: 'intern1' }),
    );
  });

  it('no-ops (no write, no audit) when the target is already the requested role', async () => {
    requireAdmin.mockResolvedValue(adminSession());
    mocks.selectQueue.push([
      { id: 'intern1', role: 'intern', email: 'intern@test.com', clerkId: 'clerk_intern1' },
    ]);

    const result = await setUserRoleAction({ userId: 'intern1', role: 'intern' });

    expect(result).toEqual({ ok: true, role: 'intern' });
    expect(mocks.updateSet).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
