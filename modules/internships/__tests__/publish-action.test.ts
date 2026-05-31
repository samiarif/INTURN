import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (u: string) => {
    throw new Error('REDIRECT:' + u);
  },
}));
vi.mock('../validators', () => ({ internshipFormSchema: { parse: (x: unknown) => x } }));

const requireActiveSession = vi.fn();
vi.mock('@/modules/auth/session', () => ({
  requireActiveSession: () => requireActiveSession(),
  requireSession: () => requireActiveSession(),
}));

const getInternshipById = vi.fn();
vi.mock('../queries', () => ({
  getInternshipById: (...a: unknown[]) => getInternshipById(...a),
  MARKETPLACE_TAG: 'marketplace',
}));

const getProjectById = vi.fn();
vi.mock('@/modules/projects/queries', () => ({
  getProjectById: (...a: unknown[]) => getProjectById(...a),
}));

const publishInternship = vi.fn();
vi.mock('../service', () => ({
  publishInternship: (...a: unknown[]) => publishInternship(...a),
  createInternship: vi.fn(),
  setInternshipStatus: vi.fn(),
  updateInternship: vi.fn(),
}));

import { publishInternshipAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  requireActiveSession.mockResolvedValue({ user: { id: 'u1' } });
  getInternshipById.mockResolvedValue({ id: 'I9', projectId: 'P9' });
});

describe('publishInternshipAction — supervisor guard', () => {
  it('forbids a non-supervisor from publishing any internship', async () => {
    getProjectById.mockResolvedValue({ id: 'P9', supervisorIds: ['someone_else'] });
    await expect(publishInternshipAction('I9')).rejects.toThrow();
    expect(publishInternship).not.toHaveBeenCalled();
  });

  it('allows the project supervisor to publish', async () => {
    getProjectById.mockResolvedValue({ id: 'P9', supervisorIds: ['u1'] });
    await publishInternshipAction('I9');
    expect(publishInternship).toHaveBeenCalledWith(expect.objectContaining({ internshipId: 'I9' }));
  });
});
