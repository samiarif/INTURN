import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { WizardSteps } from '@/components/wizard-steps';
import { WizardProgress } from '@/components/ui/wizard-progress';
import { getProfileWithUserByClerkId } from '@/modules/profiles/queries';
import type { RoleCategory } from '@/modules/profiles/validators';
import { ProfileSkillsForm } from './form';

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');

  const ctx = await getProfileWithUserByClerkId(clerkId);
  if (!ctx) redirect('/sign-in');
  if (!ctx.profile || ctx.profile.profileStep === 'none') {
    redirect('/onboarding/intern/basics');
  }

  const t = await getTranslations('onboarding.intern.skills');
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
        <WizardProgress step={2} total={3} label={tSteps('skills.step')} />
        <WizardSteps
          steps={[
            { id: 'basics', label: tSteps('basics.step'), state: 'done' },
            { id: 'skills', label: tSteps('skills.step'), state: 'on' },
            { id: 'done', label: tSteps('done.step'), state: 'todo' },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
        <p className="text-[14px] text-[var(--ink-3)] mb-8">{t('subtitle')}</p>
        <ProfileSkillsForm
          initial={{
            skills: ctx.profile.skills ?? [],
            roles: (ctx.profile.roles ?? []) as RoleCategory[],
            cvUrl: ctx.profile.resumeUrl ?? undefined,
            portfolioLinks: ctx.profile.portfolioLinks ?? [],
          }}
        />
      </main>
    </div>
  );
}
