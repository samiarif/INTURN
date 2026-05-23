import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/',
  '/(fr|en)',
  '/(fr|en)?/sign-in(.*)',
  '/(fr|en)?/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  return handleI18nRouting(req);
});

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/(api|trpc)(.*)'],
};
