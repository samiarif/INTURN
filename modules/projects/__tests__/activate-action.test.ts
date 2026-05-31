import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ projects: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (u: string) => {
    throw new Error('REDIRECT:' + u);
  },
}));
vi.mock('../validators', () => ({ projectCreateSchema: { parse: (x: unknown) => x } }));
vi.mock('@/modules/team/authz', () => ({ getCurrentOrg: vi.fn() }));

const auth = vi.fn();
vi.mock('@/lib/server-auth', () => ({ auth: () => auth() }));

const getUserByClerkId = vi.fn();
vi.mock('@/modules/profiles/queries', () => ({
  getUserByClerkId: (...a: unknown[]) => getUserByClerkId(...a),
}));

const getProjectById = vi.fn();
vi.mock('../queries', () => ({ getProjectById: (...a: unknown[]) => getProjectById(...a) }));

const transitionProjectStatus = vi.fn();
vi.mock('../service', () => ({
  transitionProjectStatus: (...a: unknown[]) => transitionProjectStatus(...a),
  createDraftProject: vi.fn(),
  updateProject: vi.fn(),
}));

import { activateProjectAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ userId: 'clerk1' });
  getUserByClerkId.mockResolvedValue({ id: 'u1' });
});

describe('activateProjectAction — supervisor guard', () => {
  it('forbids a non-supervisor from activating any project', async () => {
    getProjectById.mockResolvedValue({ id: 'P1', supervisorIds: ['other'] });
    await expect(activateProjectAction('P1')).rejects.toThrow('Forbidden');
    expect(transitionProjectStatus).not.toHaveBeenCalled();
  });

  it('allows a project supervisor to activate', async () => {
    getProjectById.mockResolvedValue({ id: 'P1', supervisorIds: ['u1'] });
    await activateProjectAction('P1');
    expect(transitionProjectStatus).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'P1', to: 'active' }),
    );
  });
});
