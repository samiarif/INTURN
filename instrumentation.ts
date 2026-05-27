/**
 * Next.js root instrumentation file — runs once per server runtime
 * (node or edge). Initializes Sentry if SENTRY_DSN is configured;
 * silently no-ops in dev / CI / branches without the env var.
 *
 * Setup ref: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Node 24 defaults DNS result order to "verbatim". Many Neon endpoints
  // resolve IPv6 addresses *first* in their DNS response — on networks
  // without working IPv6 (common on cellular / Tunisia ISPs), fetch
  // hangs for ~10s per attempt before falling back to IPv4. Forcing
  // ipv4-first eliminates the hang. Safe in prod too (Vercel's runtime
  // has both — IPv4-first just skips an empty IPv6 fallback).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setDefaultResultOrder } = await import('node:dns');
    setDefaultResultOrder('ipv4first');
  }

  if (!process.env.SENTRY_DSN) {
    // No DSN configured → no-op for Sentry. Lets local dev + CI run
    // unchanged and gates rollout to whichever environments actually
    // have the env var set.
    return;
  }

  // Lazy-import so the @sentry/nextjs dependency only loads when we
  // actually need it (and never trips up edge-runtime cold starts
  // that don't have access to it).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
      // 10% of transactions in prod; sample everything in preview/dev for
      // easier debugging.
      tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
      // Don't ship the raw request body — could leak PII (cover letters,
      // application bodies, etc.) Stick to URL + status + headers minus
      // auth.
      sendDefaultPii: false,
      // Strip Clerk session cookies + Authorization headers from breadcrumbs.
      beforeSend(event) {
        if (event.request?.cookies) delete event.request.cookies;
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-clerk-auth-token'];
        }
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? 'development',
      tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
    });
  }
}

/**
 * Called for any uncaught error in a Server Component / Server Action.
 * No-op when Sentry isn't configured so we don't crash the error path
 * itself.
 */
export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: { routerKind: 'Pages Router' | 'App Router'; routePath: string; routeType: string },
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
}
