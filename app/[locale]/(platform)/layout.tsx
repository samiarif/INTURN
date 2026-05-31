import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { PlatformSidebar } from '@/components/platform-sidebar';
import { PlatformMobileTopStrip } from '@/components/platform-mobile-top-strip';
import {
  getUnreadCount,
  listRecentNotifications,
} from '@/modules/notifications/queries';
import { getViewerMemberships } from '@/modules/team/authz';
import { getInternSidebarData } from '@/modules/workspace/queries';
import { SuspendedBanner } from '@/components/suspended-banner';
import { isDevAuthBypassed } from '@/lib/dev-auth';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect(isDevAuthBypassed() ? '/dev/login' : '/sign-in');
  if (!session.user.role) redirect('/role-selection');
  const t = await getTranslations('a11y');

  const [unreadCount, notifications] = await Promise.all([
    getUnreadCount(session.user.id),
    listRecentNotifications(session.user.id, 12),
  ]);

  // An intern who is also a managed university student gets a conditional nav
  // link. Only query for interns (others never show the link).
  let hasStudentMembership = false;
  let hasActiveWorkspace = false;
  if (session.role === 'intern') {
    const [memberships, sidebarData] = await Promise.all([
      getViewerMemberships(session.user.id),
      getInternSidebarData(session.user.id),
    ]);
    hasStudentMembership = memberships.some((m) => m.role === 'student');
    hasActiveWorkspace =
      sidebarData.role === 'intern' && sidebarData.activeWorkspaces.length > 0;
  }

  const userProps = {
    role: session.role,
    user: {
      id: session.user.id,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      email: session.user.email,
      imageUrl: session.user.imageUrl,
    },
    notifications,
    unreadCount,
    devBypassed: isDevAuthBypassed(),
    hasStudentMembership,
    hasActiveWorkspace,
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--surface)] focus:border focus:border-[var(--brand-500)] focus:rounded focus:px-4 focus:py-2 focus:text-sm"
      >
        {t('skipToContent')}
      </a>
      <PlatformMobileTopStrip {...userProps} />
      {/*
        Flex (not grid) so the layout collapses cleanly when the sidebar
        component returns null on /workspaces/ routes — otherwise the
        empty 240px grid column would push content right.
      */}
      <div className="md:flex min-h-screen">
        <PlatformSidebar {...userProps} />
        <div className="flex flex-col min-w-0 flex-1">
          {session.user.suspendedAt && <SuspendedBanner />}
          <main id="main-content" className="flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
