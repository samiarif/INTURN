'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserButton } from '@clerk/nextjs';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/ui/notification-bell';
import type { Role } from '@/modules/auth/types';
import type { Notification } from '@/db/schema';

/**
 * App shell header for every (platform) page outside the workspace.
 *
 * - Desktop: full horizontal nav
 * - Mobile (<md): hamburger button opens a slide-down sheet with the
 *   same nav items — without this every phone user sees only logo +
 *   avatar (no way to reach apps, projects, settings…). The drawer
 *   pushes content rather than overlaying so it doesn't conflict with
 *   the sticky cookie banner.
 *
 * Hides itself on workspace routes (those own their own shell).
 */
export function PlatformHeader({
  role,
  notifications,
  unreadCount,
}: {
  role: Role;
  notifications: Notification[];
  unreadCount: number;
}) {
  const tA11y = useTranslations('a11y');
  const tNav = useTranslations('platformNav');
  const tNotif = useTranslations('notifications');
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (pathname.includes('/workspaces/')) return null;

  const accountItem = { href: '/account', label: tNav('account') };
  const navItems = role === 'intern'
    ? [
        { href: '/intern/dashboard', label: tNav('dashboard') },
        { href: '/intern/applications', label: tNav('applications') },
        { href: '/intern/saved', label: tNav('saved') },
        { href: '/intern/records', label: tNav('records') },
        { href: '/intern/community', label: tNav('community') },
        { href: '/marketplace', label: tNav('browse') },
        accountItem,
      ]
    : role === 'company'
      ? [
          { href: '/company/dashboard', label: tNav('dashboard') },
          { href: '/company/projects', label: tNav('projects') },
          { href: '/marketplace', label: tNav('browse') },
          accountItem,
        ]
      : role === 'admin'
        ? [
            { href: '/admin/dashboard', label: tNav('dashboard') },
            { href: '/admin/verifications', label: tNav('verifications') },
            { href: '/admin/reports', label: tNav('reports') },
            { href: '/admin/audit', label: tNav('audit') },
            { href: '/marketplace', label: tNav('browse') },
            accountItem,
          ]
        : [];

  function isActive(href: string): boolean {
    return href === pathname || (href !== '/marketplace' && pathname.startsWith(href));
  }

  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-[var(--border-color)] bg-[var(--surface)] sticky top-0 z-30">
        <div className="flex items-center gap-3 md:gap-8">
          <button
            type="button"
            aria-label={tA11y('openMenu')}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav"
            className="md:hidden p-2 -ml-2 rounded hover:bg-[var(--surface-muted)]"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {drawerOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <Link
            href={`/${role}/dashboard`}
            className="flex items-center gap-2"
            aria-label="Inturn — home"
          >
            <GradientStar size="md" />
            <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-[14px] text-[var(--ink-2)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(item.href)
                    ? 'text-[var(--ink)] font-medium'
                    : 'hover:text-[var(--ink)] transition-colors'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden md:inline-flex">
            <LanguageSwitch />
          </span>
          <ThemeToggle
            labelDark={tA11y('switchToDark')}
            labelLight={tA11y('switchToLight')}
          />
          <NotificationBell
            initialUnread={unreadCount}
            initialItems={notifications}
            label={tNotif('label')}
          />
          <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} />
        </div>
      </header>

      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label={tA11y('closeMenu')}
            className="md:hidden fixed inset-0 top-14 z-20 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <nav
            id="mobile-nav"
            className="md:hidden fixed top-14 left-0 right-0 z-30 bg-[var(--surface)] border-b border-[var(--border-color)] shadow-lg"
            aria-label={tNav('menu')}
          >
            <ul className="flex flex-col py-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={
                      'block px-6 py-3 text-[15px] ' +
                      (isActive(item.href)
                        ? 'text-[var(--ink)] font-medium bg-[var(--surface-muted)]'
                        : 'text-[var(--ink-2)] hover:bg-[var(--surface-muted)]')
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-[var(--border-color)] mt-2 pt-2 px-6 py-3">
                <LanguageSwitch />
              </li>
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
