import { notFound } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isDevAuthBypassed } from '@/lib/dev-auth';
import { devLoginAction } from '@/modules/auth/dev-actions';
import { Avatar } from '@/components/avatar';

const SAM_EMAILS = [
  'hellowemakeitgrow@gmail.com',
  'dazzsemi@gmail.com',
  'sami.arif@thog.io',
];

/**
 * Dev-only impersonation picker. Returns 404 when DEV_AUTH_BYPASS isn't
 * set — that's belt-and-suspenders alongside the env check inside the
 * server action.
 */
export default async function DevLoginPage() {
  if (!isDevAuthBypassed()) notFound();

  const seeded = await Promise.all(
    SAM_EMAILS.map(async (email) => {
      const [u] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return u ?? null;
    }),
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[var(--bg)]">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--status-warn-bg)] text-[var(--status-warn-ink)] text-[11px] font-mono uppercase tracking-wider mb-3">
            ⚠ Dev mode
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Sign in as…</h1>
          <p className="text-[var(--ink-3)] text-sm">
            Dev-only bypass — Clerk skipped. Picks any seeded user and sets a signed cookie.
            Disable by removing <code className="font-mono">DEV_AUTH_BYPASS=1</code> from{' '}
            <code className="font-mono">.env.local</code>.
          </p>
        </div>

        <ul className="space-y-3">
          {seeded.map((u) => {
            if (!u) return null;
            const name =
              [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
            return (
              <li key={u.id}>
                <form action={devLoginAction.bind(null, u.email)}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--brand-500)] hover:bg-[var(--brand-50)] transition-colors text-left"
                  >
                    <Avatar name={name} email={u.email} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--ink)] truncate">{name}</div>
                      <div className="text-[12px] text-[var(--ink-3)] truncate">{u.email}</div>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--ink-2)] flex-shrink-0">
                      {u.role}
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        {seeded.every((u) => u === null) && (
          <p className="mt-6 text-center text-[13px] text-[var(--danger)]">
            None of the Sam-test emails are in the DB. Run <code className="font-mono">pnpm db:seed</code> first.
          </p>
        )}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
