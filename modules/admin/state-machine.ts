// Pure state machine — safe to import from client components.
// (modules/admin/service.ts touches the DB and must not be imported client-side.)

export type VerificationStatus = 'draft' | 'pending' | 'verified' | 'suspended';

const VALID: Record<VerificationStatus, VerificationStatus[]> = {
  draft: ['pending', 'verified'],
  pending: ['verified', 'draft'],
  verified: ['suspended'],
  suspended: ['verified'],
};

export function isValidVerificationTransition(
  from: VerificationStatus,
  to: VerificationStatus,
): boolean {
  return VALID[from].includes(to);
}
