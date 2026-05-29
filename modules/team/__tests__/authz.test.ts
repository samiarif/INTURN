import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  function chain() {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy']) c[m] = vi.fn(() => c);
    c.limit = vi.fn(() => Promise.resolve(selectQueue.shift() ?? []));
    (c as { then?: unknown }).then = (res: (v: unknown) => void) => res(selectQueue.shift() ?? []);
    return c;
  }
  const db = { select: vi.fn(() => chain()) };
  return { db, selectQueue };
});
vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({ organizationMembers: {}, organizations: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and') }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

import { canManageOrg, canViewProject, getActiveMembership, requireOrgRole } from '../authz';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue.length = 0;
});

describe('canManageOrg', () => {
  it('owner and admin manage; supervisor cannot', () => {
    expect(canManageOrg('owner')).toBe(true);
    expect(canManageOrg('admin')).toBe(true);
    expect(canManageOrg('supervisor')).toBe(false);
    expect(canManageOrg(null)).toBe(false);
  });
});

describe('getActiveMembership', () => {
  it('returns null when no row found', async () => {
    mocks.selectQueue.push([]);
    const result = await getActiveMembership('u1', 'o1');
    expect(result).toBeNull();
  });

  it('returns the membership when found', async () => {
    const row = { id: 'm1', userId: 'u1', organizationId: 'o1', role: 'admin', status: 'active' };
    mocks.selectQueue.push([row]);
    const result = await getActiveMembership('u1', 'o1');
    expect(result).toEqual(row);
  });
});

describe('requireOrgRole', () => {
  it('throws Forbidden when no active membership', async () => {
    mocks.selectQueue.push([]);
    await expect(requireOrgRole('u1', 'o1', ['owner', 'admin'])).rejects.toThrow('Forbidden');
  });
  it('returns the membership when role allowed', async () => {
    mocks.selectQueue.push([{ id: 'm1', userId: 'u1', organizationId: 'o1', role: 'admin', status: 'active' }]);
    const m = await requireOrgRole('u1', 'o1', ['owner', 'admin']);
    expect(m.role).toBe('admin');
  });
});

describe('canViewProject', () => {
  const project = { organizationId: 'o1', supervisorIds: ['sup1'] };

  it('platform admin always allowed (no DB read)', async () => {
    const ok = await canViewProject('anyone', 'admin', project);
    expect(ok).toBe(true);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it('assigned supervisor allowed via supervisorIds (no DB read)', async () => {
    const ok = await canViewProject('sup1', 'company', project);
    expect(ok).toBe(true);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it('org owner/admin allowed via membership lookup', async () => {
    mocks.selectQueue.push([{ id: 'm1', userId: 'u9', organizationId: 'o1', role: 'admin', status: 'active' }]);
    const ok = await canViewProject('u9', 'company', project);
    expect(ok).toBe(true);
  });

  it('org supervisor (not assigned) denied', async () => {
    mocks.selectQueue.push([{ id: 'm2', userId: 'u9', organizationId: 'o1', role: 'supervisor', status: 'active' }]);
    const ok = await canViewProject('u9', 'company', project);
    expect(ok).toBe(false);
  });

  it('non-member denied', async () => {
    mocks.selectQueue.push([]);
    const ok = await canViewProject('stranger', 'company', project);
    expect(ok).toBe(false);
  });

  it('handles null supervisorIds without throwing', async () => {
    mocks.selectQueue.push([]);
    const ok = await canViewProject('u9', 'company', { organizationId: 'o1', supervisorIds: null });
    expect(ok).toBe(false);
  });
});
