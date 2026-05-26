'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

const STORAGE_KEY = 'inturn-cookie-consent';
const VERSION = 'v1';

type Choice = 'accept-all' | 'essential-only';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { version?: string; choice?: Choice };
    return parsed.version !== VERSION;
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  // SSR: never show the banner during SSR — the client effect picks it up
  // after hydration. Avoids hydration mismatches.
  return false;
}

/**
 * Cookie consent banner — required for GDPR / Tunisia DCP-A.
 *
 * - Essential cookies (Clerk session, theme, language, consent itself)
 *   never need consent.
 * - Anything beyond that (analytics, marketing) requires explicit accept;
 *   we don't load those yet, but the consent state is in place for when
 *   we do.
 *
 * Renders nothing if a decision for the current VERSION exists.
 */
export function CookieBanner() {
  const t = useTranslations('cookieBanner');
  const locale = useLocale();
  const needsConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  function decide(choice: Choice) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: VERSION, choice, at: new Date().toISOString() }),
      );
      // Notify other tabs.
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch {
      // localStorage blocked — choice still applies for this tab/session
    }
    setDismissed(true);
  }

  if (!needsConsent || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        maxWidth: 720,
        margin: '0 auto',
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,0.25)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
        {t('body')}{' '}
        <Link
          href={`/${locale}/cookies`}
          className="rec-link"
          style={{ color: 'var(--brand-700)', textDecoration: 'underline' }}
        >
          {t('readMore')}
        </Link>
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => decide('essential-only')}
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid var(--border-color)',
            fontSize: 13,
            cursor: 'pointer',
            color: 'var(--ink-2)',
          }}
        >
          {t('essentialOnly')}
        </button>
        <button
          type="button"
          onClick={() => decide('accept-all')}
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            background: 'var(--brand-500)',
            border: 'none',
            fontSize: 13,
            cursor: 'pointer',
            color: '#fff',
            fontWeight: 500,
          }}
        >
          {t('acceptAll')}
        </button>
      </div>
    </div>
  );
}
