import { SignIn } from '@clerk/nextjs';
import { GradientStar } from '@/components/brand/gradient-star';
import { LanguageSwitch } from '@/components/language-switch';

export default function SignInPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight text-center mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--ink-3)] text-center mb-8">
            Sign in to your workspace.
          </p>
          <SignIn
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
