'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizations, organizationMembers } from '@/db/schema';
import { requireActiveSession } from '@/modules/auth/session';
import { requireOrgRole, ACTIVE_ORG_COOKIE } from './authz';
import {
  createInvite,
  acceptInvite,
  revokeInvite,
  resendInvite,
  removeMember,
  setMemberRole,
  setSupervisorProjects,
} from './service';
import { teamInviteTemplate } from '@/lib/email/templates/team-invite';
import { sendEmail } from '@/lib/email';
import { ratelimit } from '@/lib/ratelimit';

// ---------------------------------------------------------------------------
// inviteMemberAction
// ---------------------------------------------------------------------------

export async function inviteMemberAction(input: {
  orgId: string;
  email: string;
  role: 'admin' | 'supervisor';
  projectIds?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireActiveSession();
    await requireOrgRole(user.id, input.orgId, ['owner', 'admin']);

    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) {
      return { ok: false, error: 'rate_limited' };
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.orgId))
      .limit(1);
    if (!org) return { ok: false, error: 'org_not_found' };

    const { member, token } = await createInvite({
      orgId: input.orgId,
      email: input.email,
      role: input.role,
      projectIds: input.projectIds,
      invitedByUserId: user.id,
    });

    const inviterName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';

    const { subject, text, html } = teamInviteTemplate({
      orgName: org.name,
      inviterName,
      role: input.role,
      token,
      locale,
    });

    await sendEmail({
      to: member.email,
      subject,
      text,
      html,
      tags: [{ name: 'type', value: 'team.invite' }],
    });

    revalidatePath('/company/team');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

// ---------------------------------------------------------------------------
// acceptInviteAction
// ---------------------------------------------------------------------------

export async function acceptInviteAction(input: {
  token: string;
}): Promise<
  | { ok: true; orgId: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'email_mismatch' | 'already_member' | 'error' }
> {
  try {
    const { user } = await requireActiveSession();

    const result = await acceptInvite({
      token: input.token,
      userId: user.id,
      userEmail: user.email,
    });

    if (!result.ok) return result;

    // Set the accepted org as the active org cookie
    (await cookies()).set(ACTIVE_ORG_COOKIE, result.orgId, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    revalidatePath('/company/team');
    return { ok: true, orgId: result.orgId };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// ---------------------------------------------------------------------------
// revokeInviteAction
// ---------------------------------------------------------------------------

export async function revokeInviteAction(input: {
  orgId: string;
  memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireActiveSession();
    await requireOrgRole(user.id, input.orgId, ['owner', 'admin']);

    await revokeInvite({ orgId: input.orgId, memberId: input.memberId });

    revalidatePath('/company/team');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

// ---------------------------------------------------------------------------
// resendInviteAction
// ---------------------------------------------------------------------------

export async function resendInviteAction(input: {
  orgId: string;
  memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireActiveSession();
    await requireOrgRole(user.id, input.orgId, ['owner', 'admin']);

    // Resend sends an invite email — share the invite rate-limit bucket so it
    // can't be used to sidestep the per-user invite cap.
    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) {
      return { ok: false, error: 'rate_limited' };
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.orgId))
      .limit(1);
    if (!org) return { ok: false, error: 'org_not_found' };

    const { token } = await resendInvite({ orgId: input.orgId, memberId: input.memberId });

    // Re-fetch member for email + role to rebuild the email
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, input.memberId))
      .limit(1);
    if (!member) return { ok: false, error: 'member_not_found' };

    const inviterName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';

    const { subject, text, html } = teamInviteTemplate({
      orgName: org.name,
      inviterName,
      role: member.role as 'admin' | 'supervisor',
      token,
      locale,
    });

    await sendEmail({
      to: member.email,
      subject,
      text,
      html,
      tags: [{ name: 'type', value: 'team.invite' }],
    });

    revalidatePath('/company/team');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

// ---------------------------------------------------------------------------
// removeMemberAction
// ---------------------------------------------------------------------------

export async function removeMemberAction(input: {
  orgId: string;
  memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireActiveSession();
    await requireOrgRole(user.id, input.orgId, ['owner', 'admin']);

    await removeMember({ orgId: input.orgId, memberId: input.memberId });

    revalidatePath('/company/team');
    revalidatePath('/company/projects');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

// ---------------------------------------------------------------------------
// setMemberRoleAction
// ---------------------------------------------------------------------------

export async function setMemberRoleAction(input: {
  orgId: string;
  memberId: string;
  role: 'admin' | 'supervisor';
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireActiveSession();
    await requireOrgRole(user.id, input.orgId, ['owner', 'admin']);

    await setMemberRole({ orgId: input.orgId, memberId: input.memberId, role: input.role });

    revalidatePath('/company/team');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

// ---------------------------------------------------------------------------
// setSupervisorProjectsAction
// ---------------------------------------------------------------------------

export async function setSupervisorProjectsAction(input: {
  orgId: string;
  userId: string;
  projectIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireActiveSession();
    await requireOrgRole(user.id, input.orgId, ['owner', 'admin']);

    await setSupervisorProjects({
      orgId: input.orgId,
      userId: input.userId,
      projectIds: input.projectIds,
    });

    revalidatePath('/company/team');
    revalidatePath('/company/projects');
    // Also revalidate each specific project so supervisorIds are fresh
    for (const projectId of input.projectIds) {
      revalidatePath(`/company/projects/${projectId}`);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
