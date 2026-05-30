-- 0018: academic_report_comments — the university↔student rapport discussion thread.
-- A DEDICATED table (NOT the company `comments` table, whose workspace_id is NOT
-- NULL — a rapport has no workspace). Carries NO workspace_id: report comments are
-- physically isolated from company workspace comments, matching the firewall design.
-- Additive, idempotent (safe to re-run). Hand-rolled — the drizzle journal is out
-- of sync (see scripts/migrate.ts + db/migrations/README.md). Plan-1 migration 0017
-- deferred this; this is the next number.

BEGIN;

CREATE TABLE IF NOT EXISTS academic_report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES academic_reports(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academic_report_comments_report_idx
  ON academic_report_comments (report_id);

COMMIT;
