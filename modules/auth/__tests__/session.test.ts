import { describe, it, expect, vi, beforeEach } from 'vitest';

// requireUniversityRole calls requireSession which calls getSession.
// getSession uses: auth() [Clerk], db.select().from(users)... [DB], isDevAuthBypassed [dev-auth].
// We mock all three seams so getSession is fully driven by our stubs below.

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));
vi.mock('@/lib/dev-auth', () => ({
  getDevImpersonatedClerkId: vi.fn(),
  isDevAuthBypassed: vi.fn(() => false),
}));
// Neutralize React.cache — passthrough so getSession is a plain async function.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: (fn: unknown) => fn };
});

// DB mock — we control what select().from().where().limit() returns.
const dbSelectResult = vi.fn();
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: dbSelectResult,
        })),
      })),
    })),
  },
}));
vi.mock('@/db/schema', () => ({ users: {}, organizations: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq') }));

import { auth } from '@clerk/nextjs/server';
import { requireUniversityRole } from '../session';

const mockAuth = vi.mocked(auth);

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Stub the full getSession → requireSession pipeline by controlling:
 *   1. auth() → returns { userId: 'clerk-1', sessionClaims: { publicMetadata: { role } } }
 *   2. db.select()...limit() → returns [{ id: 'u1', clerkId: 'clerk-1', suspendedAt: null, role }]
 * role=null simulates unauthenticated (auth returns no userId).
 */
function stubSession(role: string | null) {
  if (role === null) {
    mockAuth.mockResolvedValue({ userId: null, sessionClaims: null } as never);
    dbSelectResult.mockResolvedValue([]);
  } else {
    mockAuth.mockResolvedValue({
      userId: 'clerk-1',
      sessionClaims: { publicMetadata: { role } },
    } as never);
    dbSelectResult.mockResolvedValue([
      { id: 'u1', clerkId: 'clerk-1', suspendedAt: null, role },
    ]);
  }
}

describe('requireUniversityRole', () => {
  it('passes for global role university', async () => {
    stubSession('university');
    const s = await requireUniversityRole();
    expect(s.role).toBe('university');
  });

  it('passes for admin (admin is a superset)', async () => {
    stubSession('admin');
    const s = await requireUniversityRole();
    expect(s.role).toBe('admin');
  });

  it('throws Forbidden for intern', async () => {
    stubSession('intern');
    await expect(requireUniversityRole()).rejects.toThrow('Forbidden');
  });

  it('throws Forbidden for company', async () => {
    stubSession('company');
    await expect(requireUniversityRole()).rejects.toThrow('Forbidden');
  });

  it('throws Unauthorized when unauthenticated', async () => {
    stubSession(null);
    await expect(requireUniversityRole()).rejects.toThrow('Unauthorized');
  });
});
