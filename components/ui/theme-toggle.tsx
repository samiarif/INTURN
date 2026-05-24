'use client';

import { useSyncExternalStore } from 'react';

const COOKIE_KEY = 'inturn-theme';

function readTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_KEY}=`));
  if (cookie) return cookie.split('=')[1] === 'dark' ? 'dark' : 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Subscribe to <html class="dark"> attribute changes so the icon updates immediately on toggle.
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
  // Server doesn't know the resolved theme; default to light. The server-injected
  // class on <html> already prevents FOUC, so the icon catching up on hydration is fine.
  return 'light';
}

export function ThemeToggle({ labelLight, labelDark }: { labelLight: string; labelDark: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const current = readTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? labelLight : labelDark}
      className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border-color)] hover:border-[var(--border-strong)] bg-[var(--surface)]"
    >
      <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
