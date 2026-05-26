'use client';

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
 * Workspace pages have their own WorkspaceTopBar; this fills the gap so
 * dashboards, applications, marketplace, saved, settings always have:
 *   - logo + brand link home
 *   - role-aware nav
 *   - lang + theme controls
 *   - Clerk UserButton (avatar with sign-out / profile)
 *
 * Hides itself on workspace routes so the WorkspaceTopBar doesn't get
 * stacked under a duplicate brand header.
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

  // Workspace routes own their own shell (topbar + sidebar). Don't double-up.
  if (pathname.includes('/workspaces/')) return null;

  const navItems = role === 'intern'
    ? [
        { href: '/intern/dashboard', label: tNav('dashboard') },
        { href: '/intern/applications', label: tNav('applications') },
        { href: '/intern/saved', label: tNav('saved') },
        { href: '/intern/records', label: tNav('records') },
        { href: '/intern/community', label: tNav('community') },
        { href: '/marketplace', label: tNav('browse') },
      ]
    : role === 'company'
      ? [
          { href: '/company/dashboard', label: tNav('dashboard') },
          { href: '/company/projects', label: tNav('projects') },
          { href: '/marketplace', label: tNav('browse') },
        ]
      : role === 'admin'
        ? [
            { href: '/admin/dashboard', label: tNav('dashboard') },
            { href: '/admin/verifications', label: tNav('verifications') },
            { href: '/admin/reports', label: tNav('reports') },
            { href: '/admin/audit', label: tNav('audit') },
            { href: '/marketplace', label: tNav('browse') },
          ]
        : [];

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)] sticky top-0 z-20">
      <div className="flex items-center gap-8">
        <Link
          href={`/${role}/dashboard`}
          className="flex items-center gap-2"
          aria-label="Inturn — home"
        >
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-[14px] text-[var(--ink-2)]">
          {navItems.map((item) => {
            const active =
              item.href === pathname ||
              (item.href !== '/marketplace' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'text-[var(--ink)] font-medium'
                    : 'hover:text-[var(--ink)] transition-colors'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitch />
        <ThemeToggle
          labelDark={tA11y('switchToDark')}
          labelLight={tA11y('switchToLight')}
        />
        <NotificationBell
          initialUnread={unreadCount}
          initialItems={notifications}
          label={tNotif('label')}
        />
        <UserButton
          appearance={{ elements: { avatarBox: 'h-9 w-9' } }}
        />
      </div>
    </header>
  );
}
