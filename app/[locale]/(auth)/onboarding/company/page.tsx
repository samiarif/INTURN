import { auth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { WizardProgress } from '@/components/ui/wizard-progress';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { CompanyProfileForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, user.id))
    .limit(1);
  const t = await getTranslations('onboarding.company');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </div>
        <LanguageSwitch />
      </header>
      <main className="max-w-3xl mx-auto p-8">
        <WizardProgress step={1} total={1} label={t('step')} />
        <h1 className="text-display font-[family-name:var(--font-display)] mb-2">{t('title')}</h1>
        <p className="text-body text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
        <CompanyProfileForm
          initial={
            existing
              ? {
                  name: existing.name,
                  industry: existing.industry ?? '',
                  size: existing.size ?? '',
                  country: existing.country ?? 'Tunisia',
                  city: existing.city ?? '',
                  description: existing.description ?? '',
                  website: existing.website ?? '',
                  logoUrl: existing.logoUrl ?? '',
                  rneUrl: existing.rneUrl ?? '',
                }
              : undefined
          }
        />
      </main>
    </div>
  );
}
