import { db } from '@/db';
import { organizations, organizationMembers } from '@/db/schema';
import { recordEvent } from '@/modules/events/service';
import { createInvite } from '@/modules/team/service';
import type { Organization } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/**
 * Admin-provisioned university org. Trusted on creation (verified=true,
 * verificationStatus='verified') — no RNE/verification quiz (company-only).
 * The provisioning admin is the initial ownerId; ownership transfers to the
 * coordinator when they accept the owner invite (see acceptInviteAction).
 */
export async function createUniversity(input: {
  adminId: string;
  name: string;
  slug?: string;
  city: string;
  country: string;
}): Promise<Organization> {
  const slug = input.slug ?? `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;

  const [created] = await db
    .insert(organizations)
    .values({
      ownerId: input.adminId,
      kind: 'university',
      name: input.name,
      slug,
      city: input.city,
      country: input.country,
      verified: true,
      verificationStatus: 'verified',
    })
    .returning();

  await recordEvent({
    type: 'organization.created',
    actorId: input.adminId,
    targetType: 'organization',
    targetId: created.id,
    metadata: { name: input.name, kind: 'university' },
  });

  return created;
}

export async function assignStudentCoordinator(input: {
  orgId: string;
  studentMemberId: string;
  coordinatorUserId: string | null;
}): Promise<void> {
  const [student] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, input.studentMemberId))
    .limit(1);
  if (!student || student.organizationId !== input.orgId || student.role !== 'student') {
    throw new Error('member_not_found');
  }

  if (input.coordinatorUserId) {
    const [coord] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, input.orgId),
          eq(organizationMembers.userId, input.coordinatorUserId),
          eq(organizationMembers.status, 'active'),
        ),
      )
      .limit(1);
    if (!coord || (coord.role !== 'owner' && coord.role !== 'admin')) {
      throw new Error('coordinator_not_found');
    }
  }

  await db
    .update(organizationMembers)
    .set({ assignedCoordinatorId: input.coordinatorUserId, updatedAt: new Date() })
    .where(eq(organizationMembers.id, input.studentMemberId));
}

export async function bulkInviteStudents(input: {
  orgId: string;
  rows: { email: string; name: string | null }[];
  assignedCoordinatorId: string;
  invitedByUserId: string;
}): Promise<{ invited: { email: string; token: string }[]; skippedDuplicate: string[] }> {
  // Validate the batch encadrant is an active owner/admin of the org (IDOR guard).
  const [coord] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.orgId),
        eq(organizationMembers.userId, input.assignedCoordinatorId),
        eq(organizationMembers.status, 'active'),
      ),
    )
    .limit(1);
  if (!coord || (coord.role !== 'owner' && coord.role !== 'admin')) {
    throw new Error('coordinator_not_found');
  }

  // Dedupe against existing non-removed members of the org.
  const existing = await db
    .select({ email: organizationMembers.email })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.orgId),
        inArray(organizationMembers.status, ['active', 'invited']),
      ),
    )
    .limit(1000);
  const taken = new Set(existing.map((e) => e.email.toLowerCase()));

  const invited: { email: string; token: string }[] = [];
  const skippedDuplicate: string[] = [];
  for (const row of input.rows) {
    const key = row.email.toLowerCase();
    if (taken.has(key)) {
      skippedDuplicate.push(row.email);
      continue;
    }
    taken.add(key); // guard against intra-batch repeats
    const { token } = await createInvite({
      orgId: input.orgId,
      email: row.email,
      role: 'student',
      assignedCoordinatorId: input.assignedCoordinatorId,
      invitedByUserId: input.invitedByUserId,
    });
    invited.push({ email: row.email, token });
  }
  return { invited, skippedDuplicate };
}
