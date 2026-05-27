import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { PlatformHeader } from '@/components/platform-header';
import {
  getUnreadCount,
  listRecentNotifications,
} from '@/modules/notifications/queries';
import { SuspendedBanner } from '@/components/suspended-banner';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (!session.user.role) redirect('/role-selection');
  const t = await getTranslations('a11y');

  const [unreadCount, notifications] = await Promise.all([
    getUnreadCount(session.user.id),
    listRecentNotifications(session.user.id, 12),
  ]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--surface)] focus:border focus:border-[var(--brand-500)] focus:rounded focus:px-4 focus:py-2 focus:text-sm"
      >
        {t('skipToContent')}
      </a>
      <PlatformHeader
        role={session.role}
        unreadCount={unreadCount}
        notifications={notifications}
      />
      {session.user.suspendedAt && <SuspendedBanner />}
      <main id="main-content">{children}</main>
    </>
  );
}
