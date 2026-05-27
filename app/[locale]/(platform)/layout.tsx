import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { PlatformSidebar } from '@/components/platform-sidebar';
import { PlatformMobileTopStrip } from '@/components/platform-mobile-top-strip';
import {
  getUnreadCount,
  listRecentNotifications,
} from '@/modules/notifications/queries';
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
      <div className="md:grid md:grid-cols-[240px_1fr] min-h-screen">
        <PlatformSidebar {...userProps} />
        <div className="flex flex-col min-w-0">
          {session.user.suspendedAt && <SuspendedBanner />}
          <main id="main-content" className="flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
