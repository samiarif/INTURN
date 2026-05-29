import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { WizardProgress } from '@/components/ui/wizard-progress';

export default async function Page() {
  const t = await getTranslations('onboarding.intern.done');
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
        <WizardProgress step={3} total={3} label={tSteps('done.step')} />
        <div className="flex flex-col items-center text-center pt-8">
          <GradientStar size="lg" />
          <h1 className="text-display font-[family-name:var(--font-display)] mt-6 mb-2">{t('title')}</h1>
          <p className="text-body text-[var(--ink-3)] max-w-sm mb-8">{t('subtitle')}</p>
          <Link
            href="/intern/dashboard"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            {t('open')}
          </Link>
        </div>
      </main>
    </div>
  );
}
