'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DEV_COOKIE_NAME, encodeDevCookie, isDevAuthBypassed } from '@/lib/dev-auth';

/**
 * Sign in as a seeded user — dev only. Hard-gated by DEV_AUTH_BYPASS so
 * this can never be invoked in a prod build.
 */
export async function devLoginAction(email: string): Promise<void> {
  if (!isDevAuthBypassed()) {
    throw new Error('dev_auth_bypass_disabled');
  }
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error(`No seeded user with email ${email}. Run pnpm db:seed first.`);
  }
  const cookieStore = await cookies();
  cookieStore.set({
    name: DEV_COOKIE_NAME,
    value: encodeDevCookie(user.clerkId),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  // Redirect to the right dashboard per role
  const dashHref =
    user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'company'
        ? '/company/dashboard'
        : '/intern/dashboard';
  redirect(dashHref);
}

export async function devLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_COOKIE_NAME);
  redirect('/');
}
