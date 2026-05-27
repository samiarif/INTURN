import { getTranslations } from 'next-intl/server';

/**
 * Banner shown at the top of the platform layout for users whose
 * account has been suspended by an admin. They can still navigate
 * read-only surfaces (dashboard, profile, account) but every write
 * action will reject via requireActiveSession.
 */
export async function SuspendedBanner() {
  const t = await getTranslations('account.suspended');
  return (
    <div
      role="status"
      className="bg-[var(--status-danger-bg)] border-b border-[var(--status-danger-border)] px-6 py-3 text-center text-[13px] text-[var(--status-danger-ink)]"
    >
      <strong className="font-semibold">{t('label')}</strong> · {t('body')}{' '}
      <a
        href="mailto:support@inturn.tn"
        className="underline underline-offset-2 hover:opacity-80"
      >
        {t('contactSupport')}
      </a>
    </div>
  );
}
