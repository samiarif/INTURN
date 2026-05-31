-- 0020: academic_report_kind — each academic_reports row is a typed deliverable
-- (livrable): rapport | presentation | diagram | other. Existing rows = rapport.
-- Additive, idempotent. TS-enum only (no DB CHECK, per project convention).
BEGIN;

ALTER TABLE academic_reports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'rapport';

COMMIT;
