import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const userUpdates: Array<Record<string, unknown>> = [];
  const orgUpdates: Array<Record<string, unknown>> = [];
  // update(table).set(payload).where(...) — route by a tag on the table mock.
  const db = {
    update: vi.fn((table: { __t?: string }) => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        if (table.__t === 'users') userUpdates.push(payload);
        else if (table.__t === 'organizations') orgUpdates.push(payload);
        return { where: vi.fn(() => Promise.resolve([])) };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })) })),
    })),
  };
  const clerkUpdateUser = vi.fn(async () => ({}));
  return { db, userUpdates, orgUpdates, clerkUpdateUser };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  users: { __t: 'users', id: 'u' },
  organizations: { __t: 'organizations', id: 'o' },
  organizationMembers: { __t: 'members', id: 'm' },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));

const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireActiveSession: (...a: unknown[]) => requireActiveSession(...a),
}));

const acceptInvite = vi.fn();
vi.mock('../service', () => ({ acceptInvite: (...a: unknown[]) => acceptInvite(...a) }));

vi.mock('../authz', () => ({
  requireOrgRole: vi.fn(),
  ACTIVE_ORG_COOKIE: 'inturn-active-org',
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: vi.fn() })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({ users: { updateUser: mocks.clerkUpdateUser } })),
}));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/email/templates/team-invite', () => ({ teamInviteTemplate: vi.fn(() => ({ subject: '', text: '', html: '' })) }));
vi.mock('@/lib/ratelimit', () => ({ ratelimit: vi.fn(() => ({ limit: vi.fn(() => ({ success: true })) })) }));

import { acceptInviteAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userUpdates.length = 0;
  mocks.orgUpdates.length = 0;
  requireActiveSession.mockResolvedValue({
    user: { id: 'user-1', email: 'coord@uni.edu', clerkId: 'clerk-1' },
  });
});

describe('acceptInviteAction — university touch-points', () => {
  it('university owner: promotes global role + transfers org ownership', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'uni-1', role: 'owner', orgKind: 'university' });

    const res = await acceptInviteAction({ token: 't' });

    expect(res).toMatchObject({ ok: true, orgId: 'uni-1', redirectTo: '/university/dashboard' });
    // Global role promoted to 'university'.
    expect(mocks.userUpdates.some((u) => u.role === 'university')).toBe(true);
    // Ownership transferred to the accepting user.
    expect(mocks.orgUpdates.some((o) => o.ownerId === 'user-1')).toBe(true);
    // Best-effort Clerk sync attempted.
    expect(mocks.clerkUpdateUser).toHaveBeenCalledWith(
      'clerk-1',
      expect.objectContaining({ publicMetadata: { role: 'university' } }),
    );
  });

  it('university admin: promotes global role but does NOT transfer ownership', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'uni-1', role: 'admin', orgKind: 'university' });

    await acceptInviteAction({ token: 't' });

    expect(mocks.userUpdates.some((u) => u.role === 'university')).toBe(true);
    expect(mocks.orgUpdates).toHaveLength(0); // no ownership transfer for admin
  });

  it('company accept: no promotion, no transfer (unaffected)', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'co-1', role: 'admin', orgKind: 'company' });

    const res = await acceptInviteAction({ token: 't' });

    expect(res).toMatchObject({ ok: true, orgId: 'co-1', redirectTo: '/company/dashboard' });
    expect(mocks.userUpdates).toHaveLength(0);
    expect(mocks.orgUpdates).toHaveLength(0);
    expect(mocks.clerkUpdateUser).not.toHaveBeenCalled();
  });

  it('Clerk sync failure does not break promotion (DB is source of truth)', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'uni-1', role: 'owner', orgKind: 'university' });
    mocks.clerkUpdateUser.mockRejectedValueOnce(new Error('offline'));

    const res = await acceptInviteAction({ token: 't' });

    expect(res).toMatchObject({ ok: true, orgId: 'uni-1', redirectTo: '/university/dashboard' });
    expect(mocks.userUpdates.some((u) => u.role === 'university')).toBe(true);
  });

  it('university student: redirects to the intern university surface', async () => {
    acceptInvite.mockResolvedValue({ ok: true, orgId: 'uni-1', role: 'student', orgKind: 'university' });

    const res = await acceptInviteAction({ token: 't' });

    expect(res).toMatchObject({ ok: true, orgId: 'uni-1', redirectTo: '/intern/university' });
    // A student gets neither the global 'university' role nor org ownership.
    expect(mocks.userUpdates).toHaveLength(0);
    expect(mocks.orgUpdates).toHaveLength(0);
  });
});
