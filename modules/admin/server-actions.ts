'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { getUserByClerkId } from '@/modules/profiles/queries';
import {
  setOrganizationVerification,
  type VerificationStatus,
} from './service';

async function requireAdmin() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  if (clerkUser.publicMetadata.role !== 'admin') throw new Error('Forbidden');
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error('User not found');
  return user;
}

export async function setVerificationStatusAction(input: {
  orgId: string;
  to: VerificationStatus;
  note?: string;
}) {
  const admin = await requireAdmin();
  await setOrganizationVerification({
    orgId: input.orgId,
    to: input.to,
    actorId: admin.id,
    note: input.note,
  });
}
