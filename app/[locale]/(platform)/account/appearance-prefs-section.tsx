'use client';

import { useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { updateAppearancePrefsAction } from '@/modules/account/server-actions';

const THEME_COOKIE = 'inturn-theme';

/**
 * P10 — appearance preferences in /account. Theme writes the no-flash
 * cookie + <html class> exactly like the header ThemeToggle (cookie is the
 * source of truth for instant, FOUC-free application), then fires a
 * best-effort persist to the user row. Locale navigates via the URL
 * (next-intl resolves from the path) and persists the choice. Both persists
 * are fire-and-forget — a failed write never blocks the visible change.
 */
function subscribe(onChange: () => void) {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
function getSnapshot(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
function getServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

export function AppearancePrefsSection() {
  const t = useTranslations('account.appearance');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setTheme(next: 'light' | 'dark') {
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Best-effort cross-device persistence; never blocks the UI.
    void updateAppearancePrefsAction({ theme: next }).catch(() => {});
  }

  function setLocale(next: 'fr' | 'en') {
    // Persist the choice regardless of whether we navigate.
    void updateAppearancePrefsAction({ locale: next }).catch(() => {});
    if (next === locale) return;
    const stripped = pathname.replace(/^\/(fr|en)(\/|$)/, '/');
    const target = next === 'fr' ? stripped : `/en${stripped === '/' ? '' : stripped}`;
    router.push(target);
  }

  return (
    <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-6 mb-4">
      <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
        {t('section')}
      </h2>
      <p className="text-[13px] text-[var(--ink-3)] mb-4">{t('intro')}</p>

      <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--border-color)] py-3">
        <div className="text-[14px] text-[var(--ink)]">{t('theme')}</div>
        <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
          <SegButton active={theme === 'light'} onClick={() => setTheme('light')}>
            {t('light')}
          </SegButton>
          <SegButton active={theme === 'dark'} onClick={() => setTheme('dark')}>
            {t('dark')}
          </SegButton>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-3">
        <div className="text-[14px] text-[var(--ink)]">{t('language')}</div>
        <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
          <SegButton active={locale === 'fr'} onClick={() => setLocale('fr')}>
            FR
          </SegButton>
          <SegButton active={locale === 'en'} onClick={() => setLocale('en')}>
            EN
          </SegButton>
        </div>
      </div>
    </section>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
        active ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-3)]'
      }`}
    >
      {children}
    </button>
  );
}
