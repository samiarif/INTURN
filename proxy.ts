import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/',
  '/(fr|en)',
  '/(fr|en)?/sign-in(.*)',
  '/(fr|en)?/sign-up(.*)',
  '/(fr|en)?/dev/login(.*)',
  '/(fr|en)?/marketplace(.*)',
  // Internship detail is public; /apply sits under it and is gated separately
  // by the page (requires complete intern profile).
  '/(fr|en)?/internships/([^/]+)',
  '/api/webhooks(.*)',
  '/api/health',
]);

// Always mount clerkMiddleware — even in dev-bypass mode. Without it,
// `auth()` calls scattered across pages throw "Clerk can't detect usage
// of clerkMiddleware()". `clerkMiddleware()` itself is purely local:
// it only reads/validates the JWT cookie when present, never hits the
// Clerk API on its own. The hang risk is from `auth.protect()` (which
// would redirect to the hosted Clerk UI) — we skip that branch when
// the bypass is on, so pages can render their own auth flow via our
// `getSession()` instead.
export default clerkMiddleware(async (auth, req) => {
  const bypassed = process.env.DEV_AUTH_BYPASS === '1';
  if (!bypassed && !isPublicRoute(req)) {
    await auth.protect();
  }
  if (req.nextUrl.pathname.startsWith('/api')) {
    return;
  }
  return handleI18nRouting(req);
});

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/(api|trpc)(.*)'],
};
