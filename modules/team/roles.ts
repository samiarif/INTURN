import type { MemberRole } from '@/db/schema';

/**
 * Pure, client-safe org-role predicate. Lives apart from authz.ts on purpose:
 * authz.ts imports `next/headers` (and the DB client), and Server vs Client
 * Components run in isolated module systems — so a Client Component importing a
 * shared module that touches `next/headers` breaks client compilation. Keeping
 * the predicate here lets both server code (via authz re-export) and client
 * components (team-client.tsx) share one implementation with no leak.
 */
export function canManageOrg(role: MemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
