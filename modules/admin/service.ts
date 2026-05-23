import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';

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

export async function setOrganizationVerification(input: {
  orgId: string;
  to: VerificationStatus;
  actorId: string;
  note?: string;
}) {
  const [current] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, input.orgId))
    .limit(1);
  if (!current) throw new Error('Organization not found');
  const from = (current.verificationStatus ?? 'draft') as VerificationStatus;
  if (!isValidVerificationTransition(from, input.to)) {
    throw new Error(`Invalid transition: ${from} → ${input.to}`);
  }
  await db
    .update(organizations)
    .set({
      verificationStatus: input.to,
      verified: input.to === 'verified', // keep legacy boolean in sync
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, input.orgId));

  await recordEvent({
    type: 'organization.verification.changed',
    actorId: input.actorId,
    targetType: 'organization',
    targetId: input.orgId,
    metadata: { from, to: input.to, note: input.note },
  });
}
