/**
 * Idempotent migration runner for prod / preview deploys.
 *
 * Why not `drizzle-kit migrate`?
 *   - The drizzle journal only tracks 0000 and 0001 (the original
 *     auto-generated migrations). Everything after 0002 is hand-rolled
 *     SQL applied via one-off scripts. Trying to feed those through
 *     drizzle-kit's runner now would require backfilling the journal
 *     on every environment.
 *
 * What this does instead:
 *   1. Creates `_inturn_migrations(name text primary key, applied_at)`
 *      if missing.
 *   2. Lists every .sql file in `db/migrations/`, sorted by filename.
 *   3. For each file not already in `_inturn_migrations`, runs it
 *      inside a single client.query() call (the .sql files wrap their
 *      own BEGIN/COMMIT) and records it.
 *
 * Files starting with `0000` or `0001` are assumed pre-applied on
 * every environment (they were created by `drizzle-kit generate`
 * before this runner existed). Production safety: each migration we
 * authored is `CREATE … IF NOT EXISTS` so even if the tracker is wrong
 * the operation is a no-op.
 *
 * Invocation:
 *   pnpm tsx scripts/migrate.ts
 *
 * Wired as `prebuild` in package.json so Vercel deploys run it
 * before `next build`. Skips silently when DATABASE_URL is unset
 * (local dev without the env, or CI lint-only jobs).
 */
import { Client } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

// 0000 and 0001 ran via drizzle-kit before this script existed.
// They're not idempotent (no `IF NOT EXISTS`), so we skip them.
const SKIP_PREFIXES = ['0000', '0001'];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[migrate] DATABASE_URL not set — skipping (this is fine for lint-only builds).');
    return;
  }

  const client = new Client(url);
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _inturn_migrations (
        name text PRIMARY KEY,
        applied_at timestamp NOT NULL DEFAULT now()
      )
    `);

    const { rows: appliedRows } = await client.query<{ name: string }>(
      'SELECT name FROM _inturn_migrations'
    );
    const applied = new Set(appliedRows.map((r) => r.name));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    let skippedCount = 0;
    for (const file of files) {
      if (SKIP_PREFIXES.some((p) => file.startsWith(p))) {
        // Pre-existed — backfill the tracker so future runs skip cleanly.
        if (!applied.has(file)) {
          await client.query('INSERT INTO _inturn_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
        }
        skippedCount++;
        continue;
      }
      if (applied.has(file)) {
        skippedCount++;
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] applying ${file}…`);
      await client.query(sql);
      await client.query('INSERT INTO _inturn_migrations(name) VALUES ($1)', [file]);
      appliedCount++;
    }

    console.log(
      `[migrate] done. Applied ${appliedCount} new migration(s), skipped ${skippedCount} already-applied.`
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[migrate] failed:', e);
  process.exit(1);
});
