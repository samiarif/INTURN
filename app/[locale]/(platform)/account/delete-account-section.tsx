'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { deleteAccountAction } from '@/modules/account/server-actions';

export function DeleteAccountSection({ email }: { email: string }) {
  const t = useTranslations('account.delete');
  const [expanded, setExpanded] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (confirmEmail.toLowerCase().trim() !== email.toLowerCase()) {
      setError(t('errorMismatch'));
      return;
    }
    startTransition(async () => {
      try {
        await deleteAccountAction({ confirmEmail });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'failed';
        if (msg === 'confirm_email_mismatch') setError(t('errorMismatch'));
        else setError(t('errorGeneric'));
      }
    });
  }

  return (
    <section className="border border-[#FCA5A5] rounded-lg bg-[#FEF2F2] p-6">
      <h2 className="text-[11px] uppercase tracking-wider font-mono text-[#B91C1C] mb-3">
        {t('section')}
      </h2>
      <p className="text-[14px] text-[var(--ink-2)] mb-4">{t('intro')}</p>
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEE2E2]"
        >
          {t('cta')}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--ink-2)]">{t('confirmInstruction', { email })}</p>
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={email}
            className="w-full px-3 py-2 rounded-md border border-[#FCA5A5] bg-white text-[14px]"
          />
          {error && <p className="text-[13px] text-[#B91C1C]">{error}</p>}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setConfirmEmail('');
                setError(null);
              }}
              disabled={pending}
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium text-[var(--ink-2)]"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || confirmEmail.toLowerCase().trim() !== email.toLowerCase()}
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[#B91C1C] text-white hover:bg-[#991B1B] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? t('deleting') : t('confirm')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
