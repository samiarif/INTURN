'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GradientStar } from '@/components/brand/gradient-star';
import { PlatformSidebar } from './platform-sidebar';
import type { Role } from '@/modules/auth/types';
import type { Notification, User } from '@/db/schema';

type Props = {
  role: Role;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl'>;
  notifications: Notification[];
  unreadCount: number;
  devBypassed?: boolean;
};

export function PlatformMobileTopStrip(props: Props) {
  const tA11y = useTranslations('a11y');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation. React's documented "reset state when
  // a dependency changes" pattern (during render, not an effect) — avoids
  // the set-state-in-effect rule and the extra commit an effect would add.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // NB: We deliberately keep the mobile top strip visible inside
  // workspaces — the hamburger stays accessible so the user can pop
  // back out to the rest of the platform.

  return (
    <>
      <div className="md:hidden h-11 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--surface)] sticky top-0 z-30">
        <button
          type="button"
          aria-label={tA11y('openMenu')}
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded hover:bg-[var(--surface-muted)]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <Link href={`/${props.role}/dashboard`} className="flex items-center gap-2">
          <GradientStar size="sm" />
          <span className="font-semibold text-[15px] tracking-tight">Inturn</span>
        </Link>
        <div className="w-9" aria-hidden />
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label={tA11y('closeMenu')}
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/40"
          />
          <div
            id="mobile-sidebar"
            className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[240px] bg-[var(--surface)] shadow-xl"
          >
            <div className="block md:block h-full">
              <PlatformSidebar {...props} forceVisible />
            </div>
          </div>
        </>
      )}
    </>
  );
}
