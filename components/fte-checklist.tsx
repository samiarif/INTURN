'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * First-time experience checklist banner. Shown on the dashboard
 * until the user has completed a meaningful first action.
 *
 * - Items are pre-computed server-side (the `done` flag on each)
 * - Dismissal is localStorage per-user-per-role so a returning user
 *   doesn't keep seeing it after they finished or chose to hide it
 * - Confetti fires once when the last unchecked item flips to done
 *   (we only fire on the client transition, not on first render with
 *   already-checked items)
 *
 * Server component contract: pass a stable list of {key, href, done}.
 * Keys must match a label in i18n under `fte.{role}.{key}`.
 */

const STORAGE_KEY_PREFIX = 'inturn-fte-dismissed';

export type FteChecklistItem = {
  key: string;
  done: boolean;
  href: string;
};

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function buildSnapshotReader(storageKey: string) {
  return function getSnapshot(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function FteChecklist({
  role,
  userId,
  items,
}: {
  role: 'intern' | 'company';
  userId: string;
  items: FteChecklistItem[];
}) {
  const t = useTranslations(`fte.${role}`);
  const storageKey = `${STORAGE_KEY_PREFIX}-${role}-${userId}`;
  const dismissed = useSyncExternalStore(
    subscribe,
    buildSnapshotReader(storageKey),
    getServerSnapshot,
  );
  const confettiFiredRef = useRef(false);

  const allDone = items.every((it) => it.done);

  // Fire confetti once when transition to all-done happens (not on
  // initial render with already-complete state). Use a ref so we
  // don't trigger an extra render — the value isn't displayed,
  // it just guards the side effect.
  useEffect(() => {
    if (!allDone || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    // Lazy-load canvas-confetti so we don't ship it to users who
    // never see the checklist.
    void import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.4 },
        scalar: 0.9,
        gravity: 0.9,
      });
    }).catch(() => {});
  }, [allDone]);

  if (dismissed) return null;
  if (allDone) return null;

  const completedCount = items.filter((it) => it.done).length;

  function dismiss() {
    try {
      localStorage.setItem(storageKey, '1');
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
    } catch {
      // localStorage blocked — banner just stays visible for the session
    }
  }

  return (
    <section
      className="mb-6 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-5"
      aria-label={t('title')}
    >
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="font-mono uppercase tracking-[0.06em] text-[11px] text-[var(--brand-700)] mb-1">
            {t('eyebrow')}
          </p>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
            {t('title')}
          </h2>
          <p className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
            {t('progress', { done: completedCount, total: items.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-[12px] text-[var(--ink-3)] hover:text-[var(--ink)] underline underline-offset-2 decoration-dotted"
        >
          {t('dismiss')}
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors ' +
                (item.done
                  ? 'opacity-60 cursor-default pointer-events-none'
                  : 'hover:bg-white/60')
              }
              tabIndex={item.done ? -1 : 0}
            >
              <span
                aria-hidden
                className={
                  'inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-semibold flex-shrink-0 ' +
                  (item.done
                    ? 'bg-[var(--status-success-ink)] border-[var(--status-success-ink)] text-white'
                    : 'border-[var(--brand-700)] text-transparent')
                }
              >
                ✓
              </span>
              <span
                className={
                  'text-[14px] ' +
                  (item.done
                    ? 'line-through text-[var(--ink-3)]'
                    : 'text-[var(--ink)] font-medium')
                }
              >
                {t(`steps.${item.key}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
