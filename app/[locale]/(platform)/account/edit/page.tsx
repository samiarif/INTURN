import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/modules/auth/session';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ProfileBasicsForm } from '@/app/[locale]/(auth)/onboarding/intern/basics/form';
import { CvImportButton } from '@/components/cv-import-button';

/**
 * In-place profile edit. Reuses the onboarding `ProfileBasicsForm` with
 * `mode="account"` so the save action returns to /account instead of
 * pushing the user through the skills/done wizard steps.
 *
 * Intern only for now — companies don't have a "basics" equivalent
 * single form; their org profile is edited via the onboarding/company
 * route (still acceptable since they edit it less often).
 */
export default async function Page() {
  const session = await requireSession();
  if (session.role !== 'intern' && session.role !== 'admin') {
    redirect('/account');
  }
  const t = await getTranslations('account');

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link
        href="/account"
        className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-block"
      >
        ← {t('title')}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('profile')}</h1>
      <p className="text-[var(--ink-3)] mb-6">{t('editIntro')}</p>

      <CvImportButton />

      <ProfileBasicsForm
        mode="account"
        initial={{
          firstName: session.user.firstName ?? undefined,
          lastName: session.user.lastName ?? undefined,
          university: profile?.university ?? undefined,
          yearOfStudy: profile?.yearOfStudy ?? undefined,
          fieldOfStudy: profile?.fieldOfStudy ?? undefined,
          city: profile?.city ?? undefined,
          preferredLanguage: (profile?.preferredLanguage ?? undefined) as 'fr' | 'en' | undefined,
        }}
      />
    </div>
  );
}
