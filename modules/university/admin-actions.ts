'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { requireAdmin } from '@/modules/auth/session';
import { createUniversity } from './service';
import { createInvite } from '@/modules/team/service';
import { universityInviteTemplate } from '@/lib/email/templates/university-invite';
import { sendEmail } from '@/lib/email';

export async function createUniversityAction(input: {
  name: string;
  slug?: string;
  city: string;
  country: string;
}): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdmin();
    const org = await createUniversity({
      adminId: user.id,
      name: input.name,
      slug: input.slug,
      city: input.city,
      country: input.country,
    });
    revalidatePath('/admin/universities');
    return { ok: true, orgId: org.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function inviteCoordinatorAction(input: {
  universityOrgId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdmin();

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.universityOrgId))
      .limit(1);
    if (!org) return { ok: false, error: 'org_not_found' };
    if (org.kind !== 'university') return { ok: false, error: 'not_a_university' };

    const { member, token } = await createInvite({
      orgId: input.universityOrgId,
      email: input.email,
      role: 'owner',
      invitedByUserId: user.id,
    });

    const inviterName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const locale = (user.localePref ?? 'fr') as 'fr' | 'en';

    const { subject, text, html } = universityInviteTemplate({
      universityName: org.name,
      inviterName,
      token,
      variant: 'coordinator',
      locale,
    });

    await sendEmail({
      to: member.email,
      subject,
      text,
      html,
      tags: [{ name: 'type', value: 'university.invite' }],
    });

    revalidatePath('/admin/universities');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
