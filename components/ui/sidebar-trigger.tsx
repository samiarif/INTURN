'use client';

import { useState } from 'react';

/**
 * Mobile sidebar drawer toggle. Sets data-mobile-open on `.ws-side` (the real
 * sidebar class in JSX) + the `.ws-sidebar-backdrop` we render below. DOM
 * query keeps state in JS, no global store. The CSS rules at the bottom of
 * modules/workspace/workspace.css handle the slide-in animation.
 */
export function SidebarTrigger({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    const sidebar = document.querySelector('.ws-side');
    const backdrop = document.querySelector('.ws-sidebar-backdrop');
    if (sidebar) sidebar.setAttribute('data-mobile-open', String(next));
    if (backdrop) backdrop.setAttribute('data-mobile-open', String(next));
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className="ws-topbar-mobile-trigger md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)]"
        style={{ display: 'none' }}
      >
        <span aria-hidden>☰</span>
      </button>
      <div className="ws-sidebar-backdrop" onClick={toggle} aria-hidden />
    </>
  );
}
