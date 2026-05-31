import { describe, it, expect, vi, beforeEach } from 'vitest';

// db.select().from().where().limit() -> Promise<next queued result>
const { db, selectResults } = vi.hoisted(() => {
  const selectResults: unknown[][] = [];
  function makeChain() {
    const chain: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'innerJoin', 'orderBy']) chain[m] = vi.fn(() => chain);
    chain.limit = vi.fn(() => Promise.resolve(selectResults.shift() ?? []));
    return chain;
  }
  return { db: { select: vi.fn(() => makeChain()) }, selectResults };
});
vi.mock('@/db', () => ({ db }));
vi.mock('@/db/schema', () => ({ applications: {}, internships: {}, workspaces: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq'), and: vi.fn(() => 'and') }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
// redirect() throws in Next; emulate so we can detect the success path.
vi.mock('next/navigation', () => ({
  redirect: (u: string) => {
    throw new Error('REDIRECT:' + u);
  },
}));

const auth = vi.fn();
vi.mock('@/lib/server-auth', () => ({ auth: () => auth() }));

const getUserByClerkId = vi.fn();
vi.mock('@/modules/profiles/queries', () => ({
  getUserByClerkId: (...a: unknown[]) => getUserByClerkId(...a),
  getProfileByUserId: vi.fn(),
}));

const getProjectById = vi.fn();
vi.mock('@/modules/projects/queries', () => ({
  getProjectById: (...a: unknown[]) => getProjectById(...a),
}));

const acceptApplication = vi.fn();
vi.mock('../service', () => ({
  acceptApplication: (...a: unknown[]) => acceptApplication(...a),
  transitionApplicationStatus: vi.fn(),
  updateInternalNotes: vi.fn(),
  createApplication: vi.fn(),
}));
vi.mock('../validators', () => ({ applyFormSchema: { parse: (x: unknown) => x } }));

import { acceptApplicationAction } from '../server-actions';

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  auth.mockResolvedValue({ userId: 'clerk_attacker' });
  getUserByClerkId.mockResolvedValue({ id: 'attacker', suspendedAt: null });
});

describe('acceptApplicationAction — cross-project IDOR guard', () => {
  it('forbids a supervisor acting on an application outside their project', async () => {
    // Attacker supervises P1. Application A2 → internship I2 → project P2 (NOT theirs).
    selectResults.push([{ id: 'A2', internshipId: 'I2' }]); // application lookup
    selectResults.push([{ id: 'I2', projectId: 'P2' }]); // internship lookup
    getProjectById.mockImplementation(async (id: string) =>
      id === 'P1'
        ? { id: 'P1', supervisorIds: ['attacker'] }
        : { id: 'P2', supervisorIds: ['other_sup'] },
    );

    // Passing their own P1 as projectId must NOT authorize them on P2's application.
    await expect(
      acceptApplicationAction({ applicationId: 'A2', projectId: 'P1' }),
    ).rejects.toThrow('Forbidden');
    expect(acceptApplication).not.toHaveBeenCalled();
  });

  it("allows the supervisor of the application's real project", async () => {
    selectResults.push([{ id: 'A1', internshipId: 'I1' }]);
    selectResults.push([{ id: 'I1', projectId: 'P1' }]);
    getProjectById.mockImplementation(async () => ({ id: 'P1', supervisorIds: ['attacker'] }));
    acceptApplication.mockResolvedValue({ workspace: { id: 'W1' } });

    // Success path ends in redirect to the new workspace.
    await expect(
      acceptApplicationAction({ applicationId: 'A1', projectId: 'P1' }),
    ).rejects.toThrow('REDIRECT:/company/workspaces/W1');
    expect(acceptApplication).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 'A1' }));
  });
});
