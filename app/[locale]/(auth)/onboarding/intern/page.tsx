import { redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { getProfileByUserId } from '@/modules/profiles/queries';
import { nextInternStep } from '@/modules/onboarding/router';

/**
 * Resume entry point for intern onboarding. Looks at the current profile
 * state and redirects to the first incomplete step, or to the dashboard if
 * the profile is fully complete.
 */
export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'intern') redirect('/');

  const profile = await getProfileByUserId(session.user.id);
  const next = nextInternStep(profile);
  if (next) redirect(next);
  redirect('/intern/dashboard');
}
