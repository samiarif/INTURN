import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getSession } from '@/modules/auth/session';
import { getInternSidebarData } from '@/modules/workspace/queries';

/**
 * `/intern/workspaces` resolves to the intern's workspace rather than dead-ending:
 * a single workspace — or a single *live* one among past internships — redirects
 * straight in. That's the one-click path from "I was just accepted" to "I'm in my
 * workspace". Zero workspaces, or an ambiguous several, fall back to the dashboard,
 * which already lists them as cards.
 *
 * localePrefix is `as-needed`, so the default locale carries no prefix.
 */
export default async function InternWorkspacesIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const dashboard = `${prefix}/intern/dashboard`;

  const session = await getSession();
  if (!session || session.role !== 'intern') redirect(dashboard);

  const sidebarData = await getInternSidebarData(session.user.id);
  const activeWorkspaces = sidebarData.role === 'intern' ? sidebarData.activeWorkspaces : [];
  const live = activeWorkspaces.filter((w) => w.live);
  const target =
    activeWorkspaces.length === 1 ? activeWorkspaces[0] : live.length === 1 ? live[0] : null;

  redirect(target ? `${prefix}/intern/workspaces/${target.id}` : dashboard);
}
