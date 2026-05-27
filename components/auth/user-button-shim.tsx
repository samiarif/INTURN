'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * Wraps Clerk's <UserButton> so it can be skipped when DEV_AUTH_BYPASS
 * is on. In bypass mode we don't even import Clerk's React context —
 * the component renders a tiny "dev mode" indicator with a sign-out
 * link instead.
 *
 * The `bypassed` prop is computed by the server-side layout that
 * renders this (it reads process.env.DEV_AUTH_BYPASS). Pure prop —
 * no client-side env lookup needed.
 */
export function UserButtonShim({ bypassed }: { bypassed: boolean }) {
  const t = useTranslations('a11y');
  if (bypassed) {
    return (
      <Link
        href="/dev/login"
        className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)] text-[11px] font-mono uppercase tracking-wider hover:opacity-80"
        title={t('switchUser')}
      >
        ⚠ Dev
      </Link>
    );
  }
  return <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} />;
}
