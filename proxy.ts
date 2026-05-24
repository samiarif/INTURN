import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/',
  '/(fr|en)',
  '/(fr|en)?/sign-in(.*)',
  '/(fr|en)?/sign-up(.*)',
  '/(fr|en)?/marketplace(.*)',
  // Internship detail is public; /apply sits under it and is gated separately
  // by the page (requires complete intern profile).
  '/(fr|en)?/internships/([^/]+)',
  '/api/webhooks(.*)',
  '/api/health',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
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
