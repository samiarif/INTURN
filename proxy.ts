import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
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

// Dev-only bypass: when DEV_AUTH_BYPASS=1 the page-level getSession()
// handles auth via the inturn-dev-session cookie. Skip clerkMiddleware
// entirely so it doesn't attempt to validate sessions against the
// unreachable Clerk API.
function devProxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api')) return;
  return handleI18nRouting(req);
}

const realProxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  if (req.nextUrl.pathname.startsWith('/api')) {
    return;
  }
  return handleI18nRouting(req);
});

export default function proxy(req: NextRequest, ev: Parameters<typeof realProxy>[1]) {
  if (process.env.DEV_AUTH_BYPASS === '1') {
    return devProxy(req);
  }
  return realProxy(req, ev);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/(api|trpc)(.*)'],
};
