import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireUniversityRole = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireUniversityRole: (...a: unknown[]) => requireUniversityRole(...a),
}));

const getCurrentOrg = vi.fn();
const requireOrgRole = vi.fn();
vi.mock('@/modules/team/authz', () => ({
  getCurrentOrg: (...a: unknown[]) => getCurrentOrg(...a),
  requireOrgRole: (...a: unknown[]) => requireOrgRole(...a),
}));

const createInvite = vi.fn();
vi.mock('@/modules/team/service', () => ({ createInvite: (...a: unknown[]) => createInvite(...a) }));

const assignStudentCoordinator = vi.fn();
vi.mock('../service', () => ({ assignStudentCoordinator: (...a: unknown[]) => assignStudentCoordinator(...a) }));

const sendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/lib/email/templates/university-invite', () => ({
  universityInviteTemplate: vi.fn(() => ({ subject: 's', text: 't', html: 'h' })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({
  ratelimit: vi.fn(() => ({ limit: vi.fn(() => ({ success: true })) })),
}));

import { inviteStudentAction, assignStudentCoordinatorAction, inviteCoordinatorAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  requireUniversityRole.mockResolvedValue({
    user: { id: 'coord-1', firstName: 'C', lastName: 'O', email: 'c@uni.edu', localePref: 'fr' },
  });
});

describe('inviteStudentAction', () => {
  it('invites a student (role=student) on the coordinator university org + emails them', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ESPRIT', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    createInvite.mockResolvedValue({ member: { email: 'stu@uni.edu' }, token: 'tok' });

    const res = await inviteStudentAction({ email: 'stu@uni.edu' });

    expect(requireUniversityRole).toHaveBeenCalled();
    expect(requireOrgRole).toHaveBeenCalledWith('coord-1', 'uni-1', ['owner', 'admin']);
    expect(createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'uni-1', email: 'stu@uni.edu', role: 'student', invitedByUserId: 'coord-1', assignedCoordinatorId: 'coord-1' }),
    );
    expect(sendEmail).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('rejects when the coordinator has no active university org', async () => {
    getCurrentOrg.mockResolvedValue(null);
    const res = await inviteStudentAction({ email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'no_university' });
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('rejects when the active org is not a university', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'co-1', name: 'Acme', kind: 'company' }, role: 'owner' });
    const res = await inviteStudentAction({ email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'no_university' });
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('returns the guard error when not a university-role user', async () => {
    requireUniversityRole.mockRejectedValue(new Error('Forbidden'));
    const res = await inviteStudentAction({ email: 'x@y.com' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
  });
});

describe('inviteCoordinatorAction (self-service)', () => {
  it('invites an encadrant (role=admin) and emails them', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    createInvite.mockResolvedValue({ member: { email: 'enc@uni' }, token: 'tok' });
    const res = await inviteCoordinatorAction({ email: 'enc@uni' });
    expect(requireOrgRole).toHaveBeenCalledWith('coord-1', 'uni-1', ['owner']);
    expect(createInvite).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'uni-1', email: 'enc@uni', role: 'admin' }));
    expect(sendEmail).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });
  it('rejects a non-head caller', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', name: 'ENIT', kind: 'university' }, role: 'admin' });
    requireOrgRole.mockRejectedValue(new Error('Forbidden'));
    const res = await inviteCoordinatorAction({ email: 'x@y' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(createInvite).not.toHaveBeenCalled();
  });
});

describe('assignStudentCoordinatorAction', () => {
  it('requires the head (owner) of the university org', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', kind: 'university' }, role: 'admin' });
    requireOrgRole.mockRejectedValue(new Error('Forbidden'));
    const res = await assignStudentCoordinatorAction({ studentMemberId: 'm1', coordinatorUserId: 'c1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(requireOrgRole).toHaveBeenCalledWith('coord-1', 'uni-1', ['owner']);
  });
  it('assigns when the caller is the head', async () => {
    getCurrentOrg.mockResolvedValue({ org: { id: 'uni-1', kind: 'university' }, role: 'owner' });
    requireOrgRole.mockResolvedValue({});
    assignStudentCoordinator.mockResolvedValue(undefined);
    const res = await assignStudentCoordinatorAction({ studentMemberId: 'm1', coordinatorUserId: 'c1' });
    expect(res).toEqual({ ok: true });
  });
});
