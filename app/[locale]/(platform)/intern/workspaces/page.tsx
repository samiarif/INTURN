import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * `/intern/workspaces` has no index view — every link in the app points at a
 * specific `/intern/workspaces/[workspaceId]`. Redirect the bare path to the
 * intern dashboard instead of 404ing.
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
  redirect(`${prefix}/intern/dashboard`);
}
