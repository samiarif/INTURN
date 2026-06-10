/**
 * Route patterns that must be reachable WITHOUT a session.
 * Consumed by proxy.ts (clerkMiddleware) and unit-tested in
 * lib/__tests__/public-routes.test.ts so compliance pages can never
 * silently fall behind the auth wall again.
 */
export const PUBLIC_ROUTE_PATTERNS = [
  '/',
  '/(fr|en)',
  '/(fr|en)?/sign-in(.*)',
  '/(fr|en)?/sign-up(.*)',
  '/(fr|en)?/dev/login(.*)',
  '/(fr|en)?/marketplace(.*)',
  // Internship detail is public; /apply sits under it and is gated separately
  // by the page (requires complete intern profile).
  '/(fr|en)?/internships/([^/]+)',
  // Public read-only record + deliverable share links. The token IS the
  // credential — the page itself looks up by token and 404s on miss. Scoped
  // to a single path segment ([^/]+) so we don't accidentally open anything
  // nested underneath.
  '/(fr|en)?/records/([^/]+)',
  '/(fr|en)?/deliverables/([^/]+)',
  // Legal/compliance pages — linked from the cookie banner and footer,
  // advertised in sitemap.xml; crawlers and signed-out users must see them.
  '/(fr|en)?/privacy',
  '/(fr|en)?/terms',
  '/(fr|en)?/cookies',
  // Marketing site pages ((site) route group) — nav/footer destinations,
  // public by definition: signed-out visitors and crawlers must reach them.
  '/(fr|en)?/how-it-works',
  '/(fr|en)?/for-companies',
  '/(fr|en)?/for-interns',
  '/(fr|en)?/for-universities',
  '/(fr|en)?/virtual-internships',
  '/(fr|en)?/verify',
  '/api/webhooks(.*)',
  '/api/health',
];
