import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { PUBLIC_ROUTE_PATTERNS } from '@/lib/public-routes';

const handleI18nRouting = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);

// Dev-only bypass: when DEV_AUTH_BYPASS=1 we DON'T mount clerkMiddleware
// at all. clerkMiddleware does a handshake/JWKS fetch to api.clerk.com the
// moment it sees a (possibly stale) Clerk cookie on the request — which
// hangs ~10s per request on networks that block api.clerk.com (the exact
// reason this bypass exists). getSession() and the lib/server-auth shim
// already short-circuit auth in bypass mode, and Clerk's raw `auth()`
// throws *synchronously* (no network) when clerkMiddleware is absent — that
// throw is caught and treated as "logged out", so unauthenticated requests
// just fall to /dev/login instead of hanging.
//
// Decided at module-eval time (once per server start). DEV_AUTH_BYPASS is a
// deploy-time flag that must NEVER be '1' in production, so prod always gets
// the real clerkMiddleware below.
const i18nOnlyProxy = (req: NextRequest) => {
  if (req.nextUrl.pathname.startsWith('/api')) return;
  return handleI18nRouting(req);
};

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  if (req.nextUrl.pathname.startsWith('/api')) {
    return;
  }
  return handleI18nRouting(req);
});

export default process.env.DEV_AUTH_BYPASS === '1' ? i18nOnlyProxy : clerkProxy;

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/(api|trpc)(.*)'],
};
