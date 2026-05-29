import { SignIn } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';
import { isDevAuthBypassed } from '@/lib/dev-auth';

/**
 * Safe relative-path allowlist for redirect_url after sign-in.
 * Only invite accept paths are permitted — no open-redirect risk.
 */
const SAFE_REDIRECT_PATTERN = /^\/(en\/)?invite\/[A-Za-z0-9_-]+$/;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // In dev-bypass mode, Clerk's <SignIn> can't bootstrap (the API is
  // unreachable, which is the whole reason for the bypass). Send the
  // user to the local-only impersonation picker instead.
  if (isDevAuthBypassed()) redirect('/dev/login');

  const sp = await searchParams;
  const rawRedirect = typeof sp.redirect_url === 'string' ? sp.redirect_url : undefined;

  // Only honour safe, relative invite paths — never an absolute URL or
  // arbitrary path that could be used for open-redirect attacks.
  const safeRedirectUrl =
    rawRedirect && SAFE_REDIRECT_PATTERN.test(rawRedirect) ? rawRedirect : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <GradientStar size="md" />
          <span className="font-semibold text-[17px] tracking-tight">Inturn</span>
        </div>
        <LanguageSwitch />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-display font-[family-name:var(--font-display)] text-center mb-2">
            Welcome back
          </h1>
          <p className="text-body text-[var(--ink-3)] text-center mb-8">
            Sign in to your workspace.
          </p>
          <SignIn
            {...(safeRedirectUrl
              ? { forceRedirectUrl: safeRedirectUrl, fallbackRedirectUrl: safeRedirectUrl }
              : {})}
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border border-[var(--border-color)] bg-[var(--surface)]',
                formButtonPrimary:
                  'bg-[var(--brand-500)] hover:bg-[var(--brand-600)]',
              },
            }}
          />
        </div>
      </main>
    </div>
  );
}
