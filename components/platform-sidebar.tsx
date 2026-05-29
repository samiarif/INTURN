'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Send,
  Bookmark,
  Award,
  MessagesSquare,
  Compass,
  Settings,
  FolderKanban,
  Briefcase,
  ShieldCheck,
  Flag,
  Users,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
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

  const accountItem = { href: '/account', label: tNav('account'), icon: Settings };
  const navItems: { href: string; label: string; icon: LucideIcon }[] = role === 'intern'
    ? [
        { href: '/intern/dashboard',     label: tNav('dashboard'),    icon: LayoutDashboard },
        { href: '/intern/applications',  label: tNav('applications'), icon: Send },
        { href: '/intern/saved',         label: tNav('saved'),        icon: Bookmark },
        { href: '/intern/records',       label: tNav('records'),      icon: Award },
        { href: '/intern/community',     label: tNav('community'),    icon: MessagesSquare },
        { href: '/marketplace',          label: tNav('browse'),       icon: Compass },
        accountItem,
      ]
    : role === 'company'
    ? [
        { href: '/company/dashboard',  label: tNav('dashboard'),  icon: LayoutDashboard },
        { href: '/company/projects',   label: tNav('projects'),   icon: FolderKanban },
        { href: '/company/workspaces', label: tNav('workspaces'), icon: Briefcase },
        { href: '/marketplace',        label: tNav('browse'),     icon: Compass },
        accountItem,
      ]
    : role === 'admin'
    ? [
        { href: '/admin/dashboard',     label: tNav('dashboard'),     icon: LayoutDashboard },
        { href: '/admin/verifications', label: tNav('verifications'), icon: ShieldCheck },
        { href: '/admin/reports',       label: tNav('reports'),       icon: Flag },
        { href: '/admin/users',         label: tNav('users'),         icon: Users },
        { href: '/admin/audit',         label: tNav('audit'),         icon: ScrollText },
        { href: '/marketplace',         label: tNav('browse'),        icon: Compass },
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
      <Link
        href={`/${role}/dashboard`}
        className="flex items-center gap-2.5 px-4 py-[18px] border-b border-[var(--border-color)]"
      >
        <GradientStar size="md" />
        <span className="text-[19px] font-bold tracking-tight text-[var(--ink)] font-[family-name:var(--font-display)]">
          Inturn
        </span>
      </Link>

      <nav aria-label={tA11y('primaryNav')} className="flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'group flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-[14.5px] transition-colors ' +
                    (active
                      ? 'bg-[var(--brand-50)] text-[var(--brand-700)] font-semibold'
                      : 'text-[var(--ink-2)] font-medium hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]')
                  }
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.4 : 2}
                    className={
                      'shrink-0 ' +
                      (active
                        ? 'text-[var(--brand-600)]'
                        : 'text-[var(--ink-4)] group-hover:text-[var(--ink-2)]')
                    }
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
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
