/**
 * One-shot: bind seeded DB rows to real Clerk users.
 *
 * Problem this solves
 * -------------------
 * Seed inserts users with placeholder clerk_id like `seed_user_dazzsemi`.
 * In local dev there's no webhook tunnel, so when Sam signs up via Clerk
 * the new (real) clerk_id never gets written back to the DB. App lookups
 * by clerk_id find nothing → user lands in onboarding instead of as
 * "Sam the company supervisor with 4 applications already in his inbox."
 *
 * What this does
 * --------------
 * For each of the 3 Sam-test emails:
 *   1. Ask Clerk: do you have a user with this email? (server SDK via
 *      CLERK_SECRET_KEY)
 *   2. If yes, grab the real clerk_id
 *   3. UPDATE the seeded users row to use that clerk_id (preserves the
 *      role + all FK relationships — applications, workspaces, records,
 *      community posts, etc.)
 *   4. Push the seeded role to Clerk's publicMetadata so the JWT carries
 *      it (avoids the role-selection redirect on first login)
 *
 * Idempotent: re-running after a successful link is a no-op.
 *
 * Run: `pnpm tsx --env-file=.env.local scripts/link-clerk-users.ts`
 * Or, if signed up but link still broken: `pnpm db:link`
 */
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SAM_EMAILS = [
  { email: 'dazzsemi@gmail.com', expectedRole: 'company' as const },
  { email: 'sami.arif@thog.io', expectedRole: 'intern' as const },
  { email: 'hellowemakeitgrow@gmail.com', expectedRole: 'admin' as const },
];

async function main() {
  // Uses CLERK_SECRET_KEY from env automatically (same as the app does)
  const clerk = await clerkClient();

  console.log('Linking Sam-test accounts to Clerk identities…\n');

  let linked = 0;
  let pending = 0;
  let alreadyOk = 0;

  for (const { email, expectedRole } of SAM_EMAILS) {
    // 1. Find the Clerk user for this email
    const list = await clerk.users.getUserList({ emailAddress: [email] });
    const clerkUser = list.data[0];

    if (!clerkUser) {
      console.log(`  ⏳ ${email.padEnd(32)}  not yet in Clerk — sign up first`);
      pending++;
      continue;
    }
    const realClerkId = clerkUser.id;

    // 2. Find the DB row by email
    const [dbRow] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!dbRow) {
      console.log(`  ✗ ${email.padEnd(32)}  no DB row found — seed not run?`);
      continue;
    }

    // 3. Link if needed
    if (dbRow.clerkId === realClerkId) {
      console.log(`  ✓ ${email.padEnd(32)}  already linked (${realClerkId.slice(0, 16)}…)`);
      alreadyOk++;
    } else {
      await db
        .update(users)
        .set({ clerkId: realClerkId, updatedAt: new Date() })
        .where(eq(users.id, dbRow.id));
      console.log(
        `  ✓ ${email.padEnd(32)}  linked  ${dbRow.clerkId.slice(0, 16)}… → ${realClerkId.slice(0, 16)}…`,
      );
      linked++;
    }

    // 4. Push role to Clerk publicMetadata so the JWT claim works
    const currentMeta = clerkUser.publicMetadata as { role?: string } | undefined;
    if (currentMeta?.role !== expectedRole) {
      await clerk.users.updateUserMetadata(realClerkId, {
        publicMetadata: { ...(currentMeta ?? {}), role: expectedRole },
      });
      console.log(`     └─ role → ${expectedRole}`);
    }
  }

  console.log(
    `\nDone. ${linked} newly linked, ${alreadyOk} already linked, ${pending} pending Clerk signup.`,
  );
  if (pending > 0) {
    console.log(
      `\nNext: sign up at http://localhost:3000/sign-up with the pending emails, then re-run this script.`,
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
