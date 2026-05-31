/**
 * Dev-only helper for verifying localized pages as each role. Prints a ready
 * `inturn-dev-session` cookie (+ sample curl lines) per seeded role so a batch
 * can render any surface in both FR (`/path`) and EN (`/en/path`) and grep the
 * SSR HTML for leaked English.
 *
 * Run (needs DEV_AUTH_BYPASS=1 on the dev server):
 *   tsx --env-file=.env.local scripts/_i18n-cookies.ts            # one cookie per role from the DB
 *   tsx --env-file=.env.local scripts/_i18n-cookies.ts <clerkId>  # offline, no DB
 *
 * HMAC scheme mirrors lib/dev-auth.ts — duplicated here on purpose because that
 * module imports next/headers and can't load outside a Next request.
 */
import { createHmac } from 'node:crypto';
import { db } from '@/db';
import { users } from '@/db/schema';

const COOKIE = 'inturn-dev-session';
const secret = process.env.DEV_AUTH_SECRET ?? 'inturn-dev-only-do-not-use-in-prod';
const encode = (clerkId: string) =>
  `${clerkId}.${createHmac('sha256', secret).update(clerkId).digest('hex')}`;

function emit(label: string, clerkId: string) {
  const value = `${COOKIE}=${encode(clerkId)}`;
  console.log(`# ${label}`);
  console.log(value);
  console.log(`  curl -s --cookie '${value}' http://localhost:3001/<path>      # FR`);
  console.log(`  curl -s --cookie '${value}' http://localhost:3001/en/<path>   # EN`);
  console.log('');
}

async function main() {
  const argIds = process.argv.slice(2);
  if (argIds.length) {
    argIds.forEach((id) => emit('argv', id));
    return;
  }

  const rows = await db
    .select({ clerkId: users.clerkId, email: users.email, role: users.role })
    .from(users);

  const seenRole = new Set<string>();
  for (const r of rows) {
    if (!r.clerkId || !r.role || seenRole.has(r.role)) continue;
    seenRole.add(r.role);
    emit(`${r.role} — ${r.email}`, r.clerkId);
  }
  if (!seenRole.size) {
    console.error('No roled users found — seed the dev DB first (pnpm db:seed).');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
