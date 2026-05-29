'use client';

import { useState, type ReactNode } from 'react';
import { ListFilter, Plus, Minus } from 'lucide-react';

/**
 * Mobile collapse wrapper for the marketplace filter rail.
 *
 * - Below lg: shows a "Filters" toggle button. Tapping it expands the
 *   filters panel above the result list.
 * - lg+: button hidden, filters always visible as a left sidebar.
 *
 * Why a client component? `<details>`+`<summary>` would work for the
 * collapse but lacks a clean way to be "open by default on desktop
 * only" — using a tiny state flag is straightforward and lets us also
 * style the toggle button.
 */
export function MarketplaceFiltersCollapse({
  label,
  activeCount,
  children,
}: {
  label: string;
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="lg:hidden inline-flex items-center justify-between w-full h-11 px-4 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)] mb-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="marketplace-filters-panel"
      >
        <span className="inline-flex items-center gap-2">
          <ListFilter size={14} strokeWidth={2} aria-hidden />
          {label}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-[var(--brand-500)] text-white text-[11px] font-semibold">
              {activeCount}
            </span>
          )}
        </span>
        <span className="inline-flex text-[var(--ink-3)]" aria-hidden>
          {open ? <Minus size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={2} />}
        </span>
      </button>
      <div
        id="marketplace-filters-panel"
        className={open ? 'block' : 'hidden lg:block'}
      >
        {children}
      </div>
    </>
  );
}
