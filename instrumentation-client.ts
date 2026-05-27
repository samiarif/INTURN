/**
 * Client-runtime Sentry init. Next.js automatically loads this file
 * (when present) before any client code. Same env-gating as the
 * server instrumentation: silent no-op when NEXT_PUBLIC_SENTRY_DSN
 * is unset.
 *
 * We deliberately keep this client init minimal — no Replay, no
 * Profiling, no extras. Those can be added behind feature flags
 * once we have real prod traffic and know what we need.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1.0,
      // Don't capture sensitive form data — Clerk auth cookies, email
      // bodies, application text. Sentry's default is conservative but
      // we explicitly opt out of PII for our use case.
      sendDefaultPii: false,
    });
  });
}

// Required by Next.js for client-side router transition tracking.
export const onRouterTransitionStart = (href: string, navigationType: string) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.captureRouterTransitionStart?.(href, navigationType);
  });
};
