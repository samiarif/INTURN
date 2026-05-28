'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/ui/notification-bell';
import { UserButtonShim } from '@/components/auth/user-button-shim';
import type { Role } from '@/modules/auth/types';
import type { Notification, User } from '@/db/schema';

type Props = {
  role: Role;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl'>;
  notifications: Notification[];
  unreadCount: number;
  devBypassed?: boolean;
  /** When true, render even below md (used by the mobile drawer). */
  forceVisible?: boolean;
};

export function PlatformSidebar({
  role,
  user,
  notifications,
  unreadCount,
  devBypassed = false,
  forceVisible = false,
}: Props) {
  const tNav = useTranslations('platformNav');
  const tNotif = useTranslations('notifications');
  const tA11y = useTranslations('a11y');
  const pathname = usePathname();

  // NB: Sidebar stays visible inside workspaces so the user keeps their
  // bearings across the whole platform. The workspace's own shell
  // (topbar + tab-bar) sits inside the main content area.

  const accountItem = { href: '/account', label: tNav('account') };
  const navItems = role === 'intern'
    ? [
        { href: '/intern/dashboard',     label: tNav('dashboard') },
        { href: '/intern/applications',  label: tNav('applications') },
        { href: '/intern/saved',         label: tNav('saved') },
        { href: '/intern/records',       label: tNav('records') },
        { href: '/intern/community',     label: tNav('community') },
        { href: '/marketplace',          label: tNav('browse') },
        accountItem,
      ]
    : role === 'company'
    ? [
        { href: '/company/dashboard',  label: tNav('dashboard') },
        { href: '/company/projects',   label: tNav('projects') },
        { href: '/company/workspaces', label: tNav('workspaces') },
        { href: '/marketplace',        label: tNav('browse') },
        accountItem,
      ]
    : role === 'admin'
    ? [
        { href: '/admin/dashboard',     label: tNav('dashboard') },
        { href: '/admin/verifications', label: tNav('verifications') },
        { href: '/admin/reports',       label: tNav('reports') },
        { href: '/admin/users',         label: tNav('users') },
        { href: '/admin/audit',         label: tNav('audit') },
        { href: '/marketplace',         label: tNav('browse') },
        accountItem,
      ]
    : [];

  function isActive(href: string): boolean {
    return href === pathname || (href !== '/marketplace' && pathname.startsWith(href));
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

  return (
    <aside
      aria-label={tA11y('mainNavigation')}
      className={`${forceVisible ? 'flex' : 'hidden md:flex'} flex-col w-[240px] h-screen sticky top-0 border-r border-[var(--border-color)] bg-[var(--surface)]`}
    >
      <Link href={`/${role}/dashboard`} className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border-color)]">
        <GradientStar size="md" />
        <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
      </Link>

      <nav aria-label={tA11y('primaryNav')} className="flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={
                  'block px-4 py-2 text-[14px] border-l-2 ' +
                  (isActive(item.href)
                    ? 'text-[var(--ink)] font-medium bg-[var(--brand-50)] border-[var(--brand-500)]'
                    : 'text-[var(--ink-2)] border-transparent hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]')
                }
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[var(--border-color)] p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <NotificationBell initialUnread={unreadCount} initialItems={notifications} label={tNotif('label')} />
          <ThemeToggle labelDark={tA11y('switchToDark')} labelLight={tA11y('switchToLight')} />
          <LanguageSwitch />
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
          <UserButtonShim bypassed={devBypassed} />
          <div className="min-w-0 flex-1 text-[12px]">
            <div className="truncate font-medium text-[var(--ink)]">{displayName}</div>
            <div className="truncate text-[var(--ink-3)]">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
