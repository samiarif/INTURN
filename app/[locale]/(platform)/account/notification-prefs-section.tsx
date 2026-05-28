'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateNotificationPrefsAction } from '@/modules/account/server-actions';

/**
 * P9 — master per-channel notification toggles. Optimistic: the switch
 * flips immediately, then the server action persists. On failure we revert
 * the affected toggle and surface the error string.
 */
export function NotificationPrefsSection({
  initialEmail,
  initialInApp,
}: {
  initialEmail: boolean;
  initialInApp: boolean;
}) {
  const t = useTranslations('account.notifications');
  const [email, setEmail] = useState(initialEmail);
  const [inApp, setInApp] = useState(initialInApp);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function persist(next: { notifyEmail: boolean; notifyInApp: boolean }) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const res = await updateNotificationPrefsAction(next);
        if (res.ok) {
          setSaved(true);
        } else {
          throw new Error('failed');
        }
      } catch {
        // Revert to the server-known values on failure.
        setEmail(initialEmail);
        setInApp(initialInApp);
        setError(t('error'));
      }
    });
  }

  function toggleEmail() {
    const next = !email;
    setEmail(next);
    persist({ notifyEmail: next, notifyInApp: inApp });
  }

  function toggleInApp() {
    const next = !inApp;
    setInApp(next);
    persist({ notifyEmail: email, notifyInApp: next });
  }

  return (
    <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-6 mb-4">
      <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
        {t('section')}
      </h2>
      <p className="text-[13px] text-[var(--ink-3)] mb-4">{t('intro')}</p>
      <div className="space-y-1">
        <ToggleRow
          label={t('email')}
          description={t('emailHint')}
          checked={email}
          disabled={pending}
          onToggle={toggleEmail}
        />
        <ToggleRow
          label={t('inApp')}
          description={t('inAppHint')}
          checked={inApp}
          disabled={pending}
          onToggle={toggleInApp}
        />
      </div>
      {error ? (
        <p className="text-[13px] text-[#B91C1C] mt-3">{error}</p>
      ) : saved ? (
        <p className="text-[13px] text-[var(--ink-3)] mt-3">{t('saved')}</p>
      ) : null}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--border-color)] py-3 last:border-b-0">
      <div>
        <div className="text-[14px] text-[var(--ink)]">{label}</div>
        <div className="text-[12px] text-[var(--ink-3)]">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors disabled:opacity-60 ${
          checked ? 'bg-[var(--brand-500)]' : 'bg-[var(--border-strong)]'
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
    </div>
  );
}
