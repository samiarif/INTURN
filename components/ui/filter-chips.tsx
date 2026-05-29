import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * FilterChips — the segmented pill row repeated across the admin surfaces
 * (audit action filter, reports/verifications status filter, users role
 * filter). One tokenized set so every list page reads the same.
 *
 * `solid` (default) is the bordered-surface chip with an inked active state;
 * `ghost` is the borderless secondary row (used for the users status filter).
 * The active chip inverts via `--ink`/`--surface` so it stays legible in dark
 * mode (a plain `text-white` would vanish on the near-white dark `--ink`).
 */
export type FilterChipItem = {
  key: string;
  label: string;
  href: string;
  count?: number;
};

function FilterChips({
  items,
  activeKey,
  variant = 'solid',
  className,
}: {
  items: FilterChipItem[];
  activeKey: string;
  variant?: 'solid' | 'ghost';
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {items.map((c) => {
        const active = c.key === activeKey;
        return (
          <Link
            key={c.key}
            href={c.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label transition-colors',
              variant === 'ghost'
                ? active
                  ? 'bg-[var(--ink-2)] text-[var(--surface)]'
                  : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                : active
                  ? 'bg-[var(--ink)] text-[var(--surface)]'
                  : 'bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]',
            )}
          >
            {c.label}
            {c.count !== undefined && (
              <span className="text-[11px] font-[family-name:var(--font-mono)] opacity-75">
                {c.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export { FilterChips };
