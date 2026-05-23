'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function setLocale(next: 'fr' | 'en') {
    if (next === locale) return;
    const stripped = pathname.replace(/^\/(fr|en)(\/|$)/, '/');
    const target = next === 'fr' ? stripped : `/en${stripped === '/' ? '' : stripped}`;
    router.push(target);
  }

  return (
    <div className="inline-flex items-center rounded-md bg-[var(--surface-muted)] border border-[var(--border-color)] p-[2px] text-[13px]">
      <button
        type="button"
        onClick={() => setLocale('fr')}
        className={cn(
          'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
          locale === 'fr'
            ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm'
            : 'text-[var(--ink-3)]',
        )}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={cn(
          'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
          locale === 'en'
            ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm'
            : 'text-[var(--ink-3)]',
        )}
      >
        EN
      </button>
    </div>
  );
}
