/**
 * Server-auth shim — drop-in replacement for Clerk's `auth()` that
 * honors the dev-only bypass cookie.
 *
 * Background: ~15 pages + server actions call `auth()` directly from
 * `@clerk/nextjs/server`. Under `DEV_AUTH_BYPASS=1`, Clerk has no
 * session, so `auth()` returns `{ userId: null }` and the page
 * `redirect('/sign-in')`s. That broke the whole platform in dev.
 *
 * Fix: every caller now imports `auth` from this file instead. We
 * short-circuit to the dev clerkId when the bypass cookie is present,
 * otherwise we forward to Clerk's real `auth()` (which is still
 * wrapped by clerkMiddleware in proxy.ts).
 *
 * Production behavior is unchanged — `isDevAuthBypassed()` is `false`
 * when `DEV_AUTH_BYPASS !== '1'`, so we always go straight to Clerk.
 */
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { getDevImpersonatedClerkId, isDevAuthBypassed } from './dev-auth';

type AuthResult = Awaited<ReturnType<typeof clerkAuth>>;

export async function auth(): Promise<AuthResult> {
  if (isDevAuthBypassed()) {
    const devClerkId = await getDevImpersonatedClerkId();
    if (devClerkId) {
      // Return the minimum shape callers depend on. `userId` is the
      // only field every caller reads; sessionClaims is undefined
      // (intentionally — getSession() reads role from the DB instead).
      return { userId: devClerkId } as unknown as AuthResult;
    }
  }
  try {
    return await clerkAuth();
  } catch (err) {
    // In dev-bypass mode, Clerk may be unreachable. Treat that as
    // "no session" so pages can render their fallback (or redirect to
    // /dev/login via getSession). In prod we re-throw — fail loud.
    if (isDevAuthBypassed()) {
      return { userId: null } as unknown as AuthResult;
    }
    throw err;
  }
}
