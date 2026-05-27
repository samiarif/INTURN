import Link from 'next/link';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { getSession } from '@/modules/auth/session';
import { SiteFooter } from '@/components/site-footer';
import { UserButtonShim } from '@/components/auth/user-button-shim';
import { isDevAuthBypassed } from '@/lib/dev-auth';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const devBypassed = isDevAuthBypassed();
  const dashHref =
    session?.role === 'admin'
      ? '/admin/dashboard'
      : session?.role === 'company'
        ? '/company/dashboard'
        : '/intern/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <Link href="/" className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[14px] text-[var(--ink-2)]">
          <Link href="/marketplace" className="hover:text-[var(--ink)]">
            Browse internships
          </Link>
          {!session && (
            <Link href="/sign-up?role=company" className="hover:text-[var(--ink)]">
              For companies
            </Link>
          )}
          {session && (
            <Link href={dashHref} className="hover:text-[var(--ink)]">
              Dashboard
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          {session ? (
            <UserButtonShim bypassed={devBypassed} />
          ) : devBypassed ? (
            <Link
              href="/dev/login"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)]"
            >
              ⚠ Dev login
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-[14px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
