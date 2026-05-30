'use server';

import { revalidatePath } from 'next/cache';
import { requireUniversityRole } from '@/modules/auth/session';
import { getCurrentOrg, requireOrgRole } from '@/modules/team/authz';
import { createInvite, resendInvite, revokeInvite } from '@/modules/team/service';
import { assignStudentCoordinator, bulkInviteStudents, assertStudentInviteManageable } from './service';
import { parseStudentCsv } from './csv';
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

export async function bulkInviteStudentsAction(input: {
  csv: string;
  encadrantUserId?: string | null;
}): Promise<
  | { ok: true; invited: number; skippedDuplicate: string[]; invalid: string[] }
  | { ok: false; error: string }
> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);

    const rl = ratelimit('university-bulk-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { rows, invalid } = parseStudentCsv(input.csv);
    if (rows.length + invalid.length > 100) return { ok: false, error: 'too_many_rows' };
    if (rows.length === 0) return { ok: true, invited: 0, skippedDuplicate: [], invalid };

    // The head may direct a batch to a chosen encadrant; an encadrant always
    // takes their own batch. bulkInviteStudents re-validates the coordinator.
    const assignedCoordinatorId =
      current.role === 'owner' && input.encadrantUserId ? input.encadrantUserId : user.id;

    const { invited, skippedDuplicate } = await bulkInviteStudents({
      orgId: current.org.id,
      rows,
      assignedCoordinatorId,
      invitedByUserId: user.id,
    });

    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    for (const inv of invited) {
      const { subject, text, html } = universityInviteTemplate({
        universityName: current.org.name,
        inviterName,
        token: inv.token,
        variant: 'student',
        locale,
      });
      await sendEmail({
        to: inv.email,
        subject,
        text,
        html,
        tags: [{ name: 'type', value: 'university.invite' }],
      });
    }

    revalidatePath('/university/dashboard');
    return { ok: true, invited: invited.length, skippedDuplicate, invalid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function revokeStudentInviteAction(input: {
  memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);
    await assertStudentInviteManageable({
      orgId: current.org.id,
      memberId: input.memberId,
      viewerRole: current.role as 'owner' | 'admin',
      viewerUserId: user.id,
    });
    await revokeInvite({ orgId: current.org.id, memberId: input.memberId });
    revalidatePath('/university/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function resendStudentInviteAction(input: {
  memberId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUniversityRole();
    const current = await getCurrentOrg(user.id);
    if (!current || current.org.kind !== 'university') return { ok: false, error: 'no_university' };
    await requireOrgRole(user.id, current.org.id, ['owner', 'admin']);
    await assertStudentInviteManageable({
      orgId: current.org.id,
      memberId: input.memberId,
      viewerRole: current.role as 'owner' | 'admin',
      viewerUserId: user.id,
    });

    const rl = ratelimit('team-invite').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    const { token } = await resendInvite({ orgId: current.org.id, memberId: input.memberId });
    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';
    const inviterName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const { subject, text, html } = universityInviteTemplate({
      universityName: current.org.name,
      inviterName,
      token,
      variant: 'student',
      locale,
    });
    await sendEmail({
      to: input.email,
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
