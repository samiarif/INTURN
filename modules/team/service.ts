/**
 * modules/team/service.ts
 *
 * Pure service logic for org-member / invite management.
 * No auth here — that lives in server-actions.ts.
 * No transactions — Neon HTTP driver is stateless; writes are ordered so
 * a mid-failure is safe to retry (idempotent, additive-first).
 */

import { randomBytes } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { organizationMembers, projects, users } from '@/db/schema';
import type { OrganizationMember } from '@/db/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(): string {
  return randomBytes(24).toString('base64url');
}

function inviteExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// createInvite
// ---------------------------------------------------------------------------

export async function createInvite(input: {
  orgId: string;
  email: string;
  role: 'admin' | 'supervisor';
  projectIds?: string[];
  invitedByUserId: string;
}): Promise<{ member: OrganizationMember; token: string }> {
  const { orgId, email, role, projectIds, invitedByUserId } = input;

  // Look up an existing user by lower-cased email to pre-link userId
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .limit(1);

  const token = makeToken();

  const [member] = await db
    .insert(organizationMembers)
    .values({
      organizationId: orgId,
      userId: existingUser?.id ?? null,
      email: email.toLowerCase(),
      role,
      status: 'invited',
      pendingProjectIds: projectIds ?? [],
      inviteToken: token,
      inviteExpiresAt: inviteExpiry(),
      invitedByUserId,
    })
    .returning();

  return { member: member as OrganizationMember, token };
}

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

export async function acceptInvite(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<
  | { ok: true; orgId: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'email_mismatch' | 'already_member' }
> {
  const { token, userId, userEmail } = input;

  const [invite] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.inviteToken, token))
    .limit(1);

  if (!invite) return { ok: false, reason: 'not_found' };

  if ((invite as OrganizationMember).status === 'active') {
    return { ok: false, reason: 'already_member' };
  }

  const now = new Date();
  const member = invite as OrganizationMember;

  if (member.inviteExpiresAt && member.inviteExpiresAt < now) {
    return { ok: false, reason: 'expired' };
  }

  if (member.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, reason: 'email_mismatch' };
  }

  // Write 1: flip the member row to active
  await db
    .update(organizationMembers)
    .set({
      status: 'active',
      userId,
      joinedAt: now,
      inviteToken: null,
      inviteExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(organizationMembers.id, member.id));

  // Write 2+: for each pendingProjectId, add userId to supervisorIds
  const pendingIds = (member.pendingProjectIds ?? []) as string[];
  for (const projectId of pendingIds) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) continue;
    const existing = (project.supervisorIds ?? []) as string[];
    if (existing.includes(userId)) continue; // idempotent
    await db
      .update(projects)
      .set({
        supervisorIds: [...existing, userId],
        updatedAt: now,
      })
      .where(eq(projects.id, projectId));
  }

  return { ok: true, orgId: member.organizationId };
}

// ---------------------------------------------------------------------------
// revokeInvite
// ---------------------------------------------------------------------------

export async function revokeInvite(input: { memberId: string }): Promise<void> {
  const now = new Date();
  await db
    .update(organizationMembers)
    .set({ status: 'removed', removedAt: now, updatedAt: now })
    .where(eq(organizationMembers.id, input.memberId));
}

// ---------------------------------------------------------------------------
// resendInvite
// ---------------------------------------------------------------------------

export async function resendInvite(input: { memberId: string }): Promise<{ token: string }> {
  const [existing] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, input.memberId))
    .limit(1);
  if (!existing) throw new Error('member_not_found');

  const token = makeToken();
  const now = new Date();
  await db
    .update(organizationMembers)
    .set({ inviteToken: token, inviteExpiresAt: inviteExpiry(), updatedAt: now })
    .where(eq(organizationMembers.id, input.memberId));

  return { token };
}

// ---------------------------------------------------------------------------
// removeMember (soft delete)
// ---------------------------------------------------------------------------

export async function removeMember(input: { memberId: string }): Promise<void> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, input.memberId))
    .limit(1);
  if (!member) throw new Error('member_not_found');

  const m = member as OrganizationMember;
  const now = new Date();

  // Write 1: soft-delete the member
  await db
    .update(organizationMembers)
    .set({ status: 'removed', removedAt: now, updatedAt: now })
    .where(eq(organizationMembers.id, input.memberId));

  // Write 2: strip userId from every org project's supervisorIds
  if (!m.userId) return;

  const orgProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, m.organizationId))
    .limit(500);

  for (const project of orgProjects as typeof projects.$inferSelect[]) {
    const existing = (project.supervisorIds ?? []) as string[];
    if (!existing.includes(m.userId)) continue;
    await db
      .update(projects)
      .set({
        supervisorIds: existing.filter((id) => id !== m.userId),
        updatedAt: now,
      })
      .where(eq(projects.id, project.id));
  }
}

// ---------------------------------------------------------------------------
// setMemberRole
// ---------------------------------------------------------------------------

export async function setMemberRole(input: {
  memberId: string;
  role: 'admin' | 'supervisor';
}): Promise<void> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, input.memberId))
    .limit(1);
  if (!member) throw new Error('member_not_found');

  if ((member as OrganizationMember).role === 'owner') {
    throw new Error('cannot_change_owner');
  }

  const now = new Date();
  await db
    .update(organizationMembers)
    .set({ role: input.role, updatedAt: now })
    .where(eq(organizationMembers.id, input.memberId));
}

// ---------------------------------------------------------------------------
// setSupervisorProjects
// ---------------------------------------------------------------------------

export async function setSupervisorProjects(input: {
  orgId: string;
  userId: string;
  projectIds: string[];
}): Promise<void> {
  const { orgId, userId, projectIds } = input;
  const targetSet = new Set(projectIds);
  const now = new Date();

  const orgProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, orgId))
    .limit(500);

  for (const project of orgProjects as typeof projects.$inferSelect[]) {
    const existing = (project.supervisorIds ?? []) as string[];
    const inTarget = targetSet.has(project.id);
    const alreadyHas = existing.includes(userId);

    if (inTarget && !alreadyHas) {
      // Add
      await db
        .update(projects)
        .set({ supervisorIds: [...existing, userId], updatedAt: now })
        .where(eq(projects.id, project.id));
    } else if (!inTarget && alreadyHas) {
      // Remove
      await db
        .update(projects)
        .set({
          supervisorIds: existing.filter((id) => id !== userId),
          updatedAt: now,
        })
        .where(eq(projects.id, project.id));
    }
    // else: no change needed
  }
}
