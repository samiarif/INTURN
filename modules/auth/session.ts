import { cache } from 'react';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Role } from './types';
import type { User, Organization } from '@/db/schema';
import { getDevImpersonatedClerkId, isDevAuthBypassed } from '@/lib/dev-auth';

export type Session = {
  clerkId: string;
  user: User;
  role: Role;
};

/**
 * Resolve the current request's session: Clerk identity + local user row + role.
 *
 * - Reads the role from Clerk JWT session claims (publicMetadata.role) when
 *   present, which avoids the per-page round-trip to Clerk's REST API. If
 *   the claim isn't there (older sessions, or Clerk hasn't synced) we fall
 *   back to a single users.role lookup that we already had from the local DB.
 * - Wrapped in React.cache so any number of components in the same render
 *   tree share one DB hit. Eliminates the "auth tax" repetition.
 *
 * Returns null for unauthenticated requests (route handlers should redirect
 * or throw 401 themselves).
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // Dev-only bypass — when DEV_AUTH_BYPASS=1 a signed cookie set by
  // /dev/login impersonates one of the seeded users without going to
  // Clerk. Strictly gated; the function itself is a no-op when the
  // flag is unset, so this path never runs in prod.
  if (isDevAuthBypassed()) {
    const devClerkId = await getDevImpersonatedClerkId();
    if (devClerkId) {
      const [user] = await db.select().from(users).where(eq(users.clerkId, devClerkId)).limit(1);
      if (user) {
        const role: Role =
          user.role === 'admin' || user.role === 'company' || user.role === 'intern'
            ? user.role
            : 'intern';
        return { clerkId: devClerkId, user, role };
      }
    }
    // Fall through to Clerk path if no dev cookie — lets the normal
    // sign-in still work alongside dev-impersonation, useful for
    // testing the bypass logic itself.
  }

  // Defensive: in dev-bypass mode, the Clerk path may not even be
  // reachable (the whole reason for the bypass). Swallow auth() errors
  // and treat them as "unauthenticated" so pages can render the
  // /dev/login link instead of crashing.
  type ClaimsShape = { publicMetadata?: { role?: string } };
  let clerkId: string | null = null;
  let sessionClaims: ClaimsShape | null = null;
  try {
    const res = await auth();
    clerkId = res.userId ?? null;
    sessionClaims = (res.sessionClaims as ClaimsShape | null) ?? null;
  } catch (err) {
    if (isDevAuthBypassed()) {
      // Expected in dev-bypass + offline mode. Don't spam logs.
      return null;
    }
    throw err;
  }
  if (!clerkId) return null;

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user) return null;

  // Prefer the JWT claim; fall back to local DB role; last-resort 'intern'.
  const claimsMeta = sessionClaims?.publicMetadata as { role?: string } | undefined;
  const claimedRole = claimsMeta?.role;
  const role: Role =
    claimedRole === 'admin' || claimedRole === 'company' || claimedRole === 'intern'
      ? claimedRole
      : user.role === 'admin' || user.role === 'company' || user.role === 'intern'
        ? user.role
        : 'intern';

  return { clerkId, user, role };
});

/**
 * Require a session or throw — for use in server actions where unauthed
 * requests should error rather than redirect.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

/**
 * Require a non-suspended session — call from any write action that
 * should be blocked for suspended users (apply, comment, post, etc.).
 * Reads still work via requireSession so users can see what they have.
 */
export async function requireActiveSession(): Promise<Session> {
  const session = await requireSession();
  if (session.user.suspendedAt) {
    throw new Error('account_suspended');
  }
  return session;
}

/**
 * Require admin role or throw.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== 'admin') throw new Error('Forbidden');
  return session;
}

/**
 * Organizations the viewer owns. Cached per-request.
 */
export const getViewerOrganizations = cache(async (userId: string): Promise<Organization[]> => {
  return db.select().from(organizations).where(eq(organizations.ownerId, userId));
});

/**
 * Resolve role from Clerk publicMetadata directly (e.g. inside a route
 * handler that doesn't need the local DB row). Falls back to undefined.
 */
export async function roleFromClerkUser(clerkId: string): Promise<Role | undefined> {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkId);
  const raw = user.publicMetadata.role;
  if (raw === 'admin' || raw === 'company' || raw === 'intern') return raw;
  return undefined;
}
