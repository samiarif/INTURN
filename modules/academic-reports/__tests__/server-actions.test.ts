import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireActiveSession: (...a: unknown[]) => requireActiveSession(...a),
}));

const requireOrgRole = vi.fn();
const getActiveMembership = vi.fn();
vi.mock('@/modules/team/authz', () => ({
  requireOrgRole: (...a: unknown[]) => requireOrgRole(...a),
  getActiveMembership: (...a: unknown[]) => getActiveMembership(...a),
}));

const svc = vi.hoisted(() => ({
  createReportDraft: vi.fn(),
  submitReport: vi.fn(),
  approveReport: vi.fn(),
  requestReportRevision: vi.fn(),
  addReportComment: vi.fn(),
}));
vi.mock('../service', () => svc);

const reportRowQueue: unknown[][] = vi.hoisted(() => []) as unknown[][];
vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(reportRowQueue.shift() ?? []) }) }),
    }),
  },
}));
vi.mock('@/db/schema', () => ({ academicReports: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/blob', () => ({ assertOurBlobUrl: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({
  ratelimit: vi.fn(() => ({ limit: vi.fn(() => ({ success: true })) })),
}));

import {
  createReportDraftAction,
  submitReportAction,
  approveReportAction,
  requestReportRevisionAction,
  addReportCommentAction,
} from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  reportRowQueue.length = 0;
});

describe('createReportDraftAction — student-membership gate', () => {
  it('rejects a non-student member (role owner) with Forbidden and does NOT call createReportDraft', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    getActiveMembership.mockResolvedValue({ role: 'owner' });
    const res = await createReportDraftAction({ universityOrgId: 'uni1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(svc.createReportDraft).not.toHaveBeenCalled();
  });

  it('rejects when there is no membership (null) with Forbidden and does NOT call createReportDraft', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'rando' }, role: 'intern' });
    getActiveMembership.mockResolvedValue(null);
    const res = await createReportDraftAction({ universityOrgId: 'uni1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(svc.createReportDraft).not.toHaveBeenCalled();
  });

  it('succeeds when the caller holds an active student membership', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    getActiveMembership.mockResolvedValue({ role: 'student' });
    svc.createReportDraft.mockResolvedValue({});
    const res = await createReportDraftAction({ universityOrgId: 'uni1', title: 'My Report' });
    expect(svc.createReportDraft).toHaveBeenCalledWith(
      expect.objectContaining({ studentUserId: 'stu1', universityOrgId: 'uni1', title: 'My Report' }),
    );
    expect(res).toEqual({ ok: true });
  });

  it('createReportDraftAction forwards a valid kind', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    getActiveMembership.mockResolvedValue({ role: 'student' });
    svc.createReportDraft.mockResolvedValue({});
    await createReportDraftAction({ universityOrgId: 'u1', kind: 'diagram', title: 'Schéma' });
    expect(svc.createReportDraft).toHaveBeenCalledWith(expect.objectContaining({ kind: 'diagram', title: 'Schéma' }));
  });

  it('createReportDraftAction coerces an unknown kind to rapport', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    getActiveMembership.mockResolvedValue({ role: 'student' });
    svc.createReportDraft.mockResolvedValue({});
    await createReportDraftAction({ universityOrgId: 'u1', kind: 'bogus' as never });
    expect(svc.createReportDraft).toHaveBeenCalledWith(expect.objectContaining({ kind: 'rapport' }));
  });
});

describe('submitReportAction — student owns the report', () => {
  it('submits when the caller is the owning student', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'draft' }]);
    const res = await submitReportAction({
      reportId: 'r1', fileUrl: 'https://blob/r.pdf', fileName: 'r.pdf', fileType: 'application/pdf',
    });
    expect(svc.submitReport).toHaveBeenCalledWith(
      expect.objectContaining({ reportId: 'r1', actorId: 'stu1', fileName: 'r.pdf' }),
    );
    expect(res).toEqual({ ok: true });
  });

  it('rejects when the caller is NOT the owning student', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'other' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'draft' }]);
    const res = await submitReportAction({
      reportId: 'r1', fileUrl: 'https://blob/r.pdf', fileName: 'r.pdf', fileType: 'application/pdf',
    });
    expect(res.ok).toBe(false);
    expect(svc.submitReport).not.toHaveBeenCalled();
  });
});

describe('approveReportAction — coordinator membership-gated (IDOR-safe)', () => {
  it('approves when the caller owns/admins the report university org', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockResolvedValue({});
    const res = await approveReportAction({ reportId: 'r1' });
    expect(requireOrgRole).toHaveBeenCalledWith('coord1', 'uni1', ['owner', 'admin']);
    expect(svc.approveReport).toHaveBeenCalledWith({ reportId: 'r1', actorId: 'coord1' });
    expect(res).toEqual({ ok: true });
  });

  it('rejects a foreign-university coordinator (requireOrgRole throws)', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord2' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockRejectedValue(new Error('Forbidden'));
    const res = await approveReportAction({ reportId: 'r1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(svc.approveReport).not.toHaveBeenCalled();
  });

  it('rejects the owning student trying to approve their own report', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockRejectedValue(new Error('Forbidden')); // student has no owner/admin membership
    const res = await approveReportAction({ reportId: 'r1' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
  });
});

describe('requestReportRevisionAction', () => {
  it('rejects a foreign-university coordinator (requireOrgRole throws)', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord2' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockRejectedValue(new Error('Forbidden'));
    const res = await requestReportRevisionAction({ reportId: 'r1', feedback: 'please fix' });
    expect(res).toEqual({ ok: false, error: 'Forbidden' });
    expect(svc.requestReportRevision).not.toHaveBeenCalled();
  });

  it('requires non-empty feedback', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockResolvedValue({});
    const res = await requestReportRevisionAction({ reportId: 'r1', feedback: '   ' });
    expect(res.ok).toBe(false);
    expect(svc.requestReportRevision).not.toHaveBeenCalled();
  });

  it('requests revision with trimmed feedback', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', universityOrgId: 'uni1', status: 'submitted' }]);
    requireOrgRole.mockResolvedValue({});
    await requestReportRevisionAction({ reportId: 'r1', feedback: '  fix sources  ' });
    expect(svc.requestReportRevision).toHaveBeenCalledWith(
      expect.objectContaining({ reportId: 'r1', feedback: 'fix sources', actorId: 'coord1' }),
    );
  });
});

describe('addReportCommentAction — both sides allowed', () => {
  it('allows the owning student', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'stu1' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1' }]);
    const res = await addReportCommentAction({ reportId: 'r1', body: 'hi' });
    expect(svc.addReportComment).toHaveBeenCalledWith({ reportId: 'r1', authorId: 'stu1', body: 'hi' });
    expect(res).toEqual({ ok: true });
  });

  it('allows an owner/admin of the report university org', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'coord1' }, role: 'university' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1' }]);
    getActiveMembership.mockResolvedValue({ role: 'owner' });
    const res = await addReportCommentAction({ reportId: 'r1', body: 'noted' });
    expect(svc.addReportComment).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('rejects an unrelated user (not student, not org staff)', async () => {
    requireActiveSession.mockResolvedValue({ user: { id: 'rando' }, role: 'intern' });
    reportRowQueue.push([{ id: 'r1', studentUserId: 'stu1', universityOrgId: 'uni1' }]);
    getActiveMembership.mockResolvedValue(null);
    const res = await addReportCommentAction({ reportId: 'r1', body: 'x' });
    expect(res.ok).toBe(false);
    expect(svc.addReportComment).not.toHaveBeenCalled();
  });
});
