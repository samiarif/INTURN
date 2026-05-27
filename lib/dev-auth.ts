/**
 * Dev-only auth bypass — lets the platform work without reaching Clerk.
 *
 * Hard gated by `DEV_AUTH_BYPASS=1`. The flag is checked on EVERY read so
 * a stale build can't carry the bypass into production:
 *   - If unset → cookie + login route are completely inert
 *   - If set to anything other than '1' → also inert
 *
 * Why this exists: Clerk's API is unreachable from some networks
 * (Tunisia ISP / Cloudflare quirks). Local dev would otherwise be
 * impossible without a tunnel or VPN. The bypass impersonates one of
 * the seeded users by storing their seeded clerk_id in a signed cookie.
 *
 * What it does NOT do: provide real auth in production. The cookie is
 * trivially forgeable if you have the bypass enabled — that's the
 * whole point. Never set `DEV_AUTH_BYPASS=1` in any deployed env.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const DEV_COOKIE_NAME = 'inturn-dev-session';

/**
 * True only when the explicit dev-bypass env flag is set to '1'.
 * Every caller checks this before doing anything — defense in depth.
 */
export function isDevAuthBypassed(): boolean {
  return process.env.DEV_AUTH_BYPASS === '1';
}

/**
 * Shared secret for cookie HMAC. Uses a separate env var so prod can't
 * accidentally inherit a dev secret. Falls back to a fixed dev string
 * — fine because the whole bypass is dev-only.
 */
function devSecret(): string {
  return process.env.DEV_AUTH_SECRET ?? 'inturn-dev-only-do-not-use-in-prod';
}

function sign(clerkId: string): string {
  return createHmac('sha256', devSecret()).update(clerkId).digest('hex');
}

function verify(clerkId: string, signature: string): boolean {
  const expected = sign(clerkId);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Format: `<clerkId>.<hmac-sha256(clerkId, secret)>`. Same shape as a
 * minimal JWS — no expiry, no audience, this is local dev only.
 */
export function encodeDevCookie(clerkId: string): string {
  return `${clerkId}.${sign(clerkId)}`;
}

export function decodeDevCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;
  const clerkId = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  return verify(clerkId, signature) ? clerkId : null;
}

/**
 * Read the dev-session cookie (if bypass is on) and return the seeded
 * clerk_id it points to. Used by getSession() to short-circuit Clerk.
 */
export async function getDevImpersonatedClerkId(): Promise<string | null> {
  if (!isDevAuthBypassed()) return null;
  const c = await cookies();
  return decodeDevCookie(c.get(DEV_COOKIE_NAME)?.value);
}
