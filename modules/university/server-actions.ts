'use server';

import { revalidatePath } from 'next/cache';
import { requireUniversityRole } from '@/modules/auth/session';
import { getCurrentOrg, requireOrgRole } from '@/modules/team/authz';
import { createInvite } from '@/modules/team/service';
import { assignStudentCoordinator } from './service';
import { universityInviteTemplate } from '@/lib/email/templates/university-invite';
import { sendEmail } from '@/lib/email';
import { ratelimit } from '@/lib/ratelimit';

export async function inviteStudentAction(input: {
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();

    // Resolve the coordinator's active org; must be a university they own/admin.
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') {
      return { ok: false, error: 'no_university' };
    }
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);

    // Rate-limit student invites (a coordinator is less trusted than admin;
    // student-invite spam is a real abuse vector). Shares the team-invite bucket.
    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { member, token } = await createInvite({
      orgId: current.org.id,
      email: input.email,
      role: 'student',
      invitedByUserId: user.id,
      // Inviter owns the student until a head reassigns them.
      assignedCoordinatorId: user.id,
    });

    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    const { subject, text, html } = universityInviteTemplate({
      universityName: current.org.name,
      inviterName,
      token,
      variant: 'student',
      locale,
    });

    await sendEmail({
      to: member.email,
      subject,
      text,
      html,
      tags: [{ name: 'type', value: 'university.invite' }],
    });

    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function inviteCoordinatorAction(input: {
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner']); // only the head adds coordinators

    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { member, token } = await createInvite({
      orgId: current.org.id,
      email: input.email,
      role: 'admin', // encadrant
      invitedByUserId: user.id,
    });

    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const { subject, text, html } = universityInviteTemplate({
      universityName: current.org.name, inviterName, token, variant: 'coordinator', locale,
    });
    await sendEmail({ to: member.email, subject, text, html, tags: [{ name: 'type', value: 'university.invite' }] });

    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function assignStudentCoordinatorAction(input: {
  studentMemberId: string;
  coordinatorUserId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner']); // head-only: encadrants can't reassign
    await assignStudentCoordinator({
      orgId: current.org.id,
      studentMemberId: input.studentMemberId,
      coordinatorUserId: input.coordinatorUserId,
    });
    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
