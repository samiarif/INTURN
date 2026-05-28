# Migrations

Migrations are **hand-rolled idempotent SQL files**, applied by a **custom
runner** (`scripts/migrate.ts`) — NOT by `drizzle-kit migrate`.

## How it works

`pnpm db:migrate` runs `scripts/migrate.ts`, which:

1. Creates a `_inturn_migrations(name, applied_at)` bookkeeping table if absent.
2. Lists every `.sql` file in `db/migrations/`, sorted by filename.
3. Runs each file not already recorded in `_inturn_migrations`, then records it.
   Each `.sql` file wraps its own `BEGIN; … COMMIT;`.

Files `0000_*`/`0001_*` are treated as the pre-applied baseline (the schema was
originally pushed via `db:push` before migration files existed).

## Writing a new migration

Create `NNNN_short_name.sql` (next sequential number) with **idempotent** DDL so
re-runs are safe:

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS foo ( ... );
ALTER TABLE bar ADD COLUMN IF NOT EXISTS baz text;
CREATE INDEX IF NOT EXISTS bar_baz_idx ON bar (baz);
COMMIT;
```

Then `pnpm db:migrate` to apply. See `0013_*.sql` / `0014_*.sql` for the pattern.

## About `drizzle-kit generate`

`pnpm db:generate` is useful **only to PREVIEW** the SQL for a schema change —
hand-copy its output into a correctly-numbered file and make it idempotent.

⚠️ Do NOT rely on drizzle-kit's filenames or its journal. `db/migrations/meta/`
(the drizzle journal) is **gitignored** and out of sync with the actual migration
files — it is NOT authoritative. The `.sql` files + `scripts/migrate.ts` are the
source of truth.

## Dev workflow

`pnpm db:push` (drizzle-kit schema diff, no migration file) is fine for throwaway
local experiments, but anything shipping to production/CI must land as a numbered,
idempotent `.sql` migration so `pnpm db:migrate` applies the same change everywhere.
