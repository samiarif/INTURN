import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/modules/auth/session', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));

const createUniversity = vi.fn();
vi.mock('../service', () => ({ createUniversity: (...a: unknown[]) => createUniversity(...a) }));

const createInvite = vi.fn();
vi.mock('@/modules/team/service', () => ({ createInvite: (...a: unknown[]) => createInvite(...a) }));

const sendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/lib/email/templates/university-invite', () => ({
  universityInviteTemplate: vi.fn(() => ({ subject: 's', text: 't', html: 'h' })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const orgLimit = vi.fn();
vi.mock('@/db', () => ({
  db: { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: orgLimit })) })) })) },
}));
vi.mock('@/db/schema', () => ({ organizations: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and') }));

import { createUniversityAction, inviteCoordinatorAction } from '../admin-actions';

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1', firstName: 'A', lastName: 'B', email: 'a@x.com', localePref: 'fr' } });
});

describe('createUniversityAction', () => {
  it('requires admin and delegates to createUniversity', async () => {
    createUniversity.mockResolvedValue({ id: 'uni-1' });
    const res = await createUniversityAction({ name: 'ESPRIT', city: 'Tunis', country: 'TN' });
    expect(requireAdmin).toHaveBeenCalled();
    expect(createUniversity).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 'admin-1', name: 'ESPRIT', city: 'Tunis', country: 'TN' }),
    );
    expect(res).toEqual({ ok: true, orgId: 'uni-1' });
  });

  it('returns an error result when not admin', async () => {
    requireAdmin.mockRejectedValue(new Error('Forbidden'));
    const res = await createUniversityAction({ name: 'X', city: 'T', country: 'TN' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
  });
});

describe('inviteCoordinatorAction', () => {
  it('creates an owner invite on the university org + sends the coordinator email', async () => {
    orgLimit.mockResolvedValue([{ id: 'uni-1', name: 'ESPRIT', kind: 'university' }]);
    createInvite.mockResolvedValue({ member: { email: 'coord@uni.edu' }, token: 'tok' });

    const res = await inviteCoordinatorAction({ universityOrgId: 'uni-1', email: 'coord@uni.edu' });

    expect(requireAdmin).toHaveBeenCalled();
    expect(createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'uni-1', email: 'coord@uni.edu', role: 'owner', invitedByUserId: 'admin-1' }),
    );
    expect(sendEmail).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('rejects when the org is not a university', async () => {
    orgLimit.mockResolvedValue([{ id: 'co-1', name: 'Acme', kind: 'company' }]);
    const res = await inviteCoordinatorAction({ universityOrgId: 'co-1', email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'not_a_university' });
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('rejects when the org does not exist', async () => {
    orgLimit.mockResolvedValue([]);
    const res = await inviteCoordinatorAction({ universityOrgId: 'missing', email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'org_not_found' });
  });
});
