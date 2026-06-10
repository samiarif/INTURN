import { describe, it, expect } from 'vitest';
import { createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { PUBLIC_ROUTE_PATTERNS } from '@/lib/public-routes';

const matcher = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);
const req = (path: string) => new NextRequest(`http://localhost${path}`);

describe('public route allowlist', () => {
  it.each(['/privacy', '/terms', '/cookies', '/fr/privacy', '/en/terms', '/en/cookies'])(
    'legal page %s is public',
    (p) => expect(matcher(req(p))).toBe(true),
  );
  it.each([
    '/how-it-works',
    '/for-companies',
    '/fr/for-interns',
    '/en/for-universities',
    '/virtual-internships',
    '/fr/verify',
  ])('marketing site page %s is public', (p) => expect(matcher(req(p))).toBe(true));
  it.each([
    '/',
    '/fr',
    '/marketplace',
    '/fr/marketplace',
    '/internships/abc-123',
    '/records/tok123',
    '/deliverables/tok456',
    '/api/health',
  ])('existing public route %s stays public', (p) => expect(matcher(req(p))).toBe(true));
  it.each(['/intern/dashboard', '/fr/company/projects', '/admin/users', '/api/upload', '/records/a/b'])(
    'protected route %s is NOT public',
    (p) => expect(matcher(req(p))).toBe(false),
  );
});
