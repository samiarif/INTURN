import { auth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { WizardSteps } from '@/components/wizard-steps';
import { WizardProgress } from '@/components/ui/wizard-progress';
import { getProfileWithUserByClerkId } from '@/modules/profiles/queries';
import { ProfileBasicsForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');

  const ctx = await getProfileWithUserByClerkId(clerkId);
  if (!ctx) redirect('/sign-in');

  const t = await getTranslations('onboarding.intern.basics');
  const tSteps = await getTranslations('onboarding.intern');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </div>
        <LanguageSwitch />
      </header>
      <main className="max-w-2xl mx-auto p-8">
        <WizardProgress step={1} total={3} label={tSteps('basics.step')} />
        <WizardSteps
          steps={[
            { id: 'basics', label: tSteps('basics.step'), state: 'on' },
            { id: 'skills', label: tSteps('skills.step'), state: 'todo' },
            { id: 'done', label: tSteps('done.step'), state: 'todo' },
          ]}
        />
        <h1 className="text-display font-[family-name:var(--font-display)] mb-2">{t('title')}</h1>
        <p className="text-body text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
        <ProfileBasicsForm
          initial={{
            firstName: ctx.user.firstName ?? undefined,
            lastName: ctx.user.lastName ?? undefined,
            university: ctx.profile?.university ?? undefined,
            yearOfStudy: ctx.profile?.yearOfStudy ?? undefined,
            fieldOfStudy: ctx.profile?.fieldOfStudy ?? undefined,
            city: ctx.profile?.city ?? undefined,
            preferredLanguage:
              (ctx.profile?.preferredLanguage as 'fr' | 'en' | undefined) ?? 'fr',
          }}
        />
      </main>
    </div>
  );
}
