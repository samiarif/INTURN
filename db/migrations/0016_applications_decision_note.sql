-- 0016: applicant-visible decision feedback on applications.
-- Distinct from internal_notes (company-private). Additive, nullable, no backfill.
-- Hand-rolled idempotent (the drizzle journal is out of sync — see scripts/migrate.ts).

BEGIN;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS decision_note text;

COMMIT;
