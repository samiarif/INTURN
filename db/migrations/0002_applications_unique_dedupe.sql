-- Sprint A hygiene:
--   1. dedupe applications by (internship_id, applicant_id), keeping the oldest
--   2. add UNIQUE constraint on (internship_id, applicant_id)
--   3. add compound index for inbox-status queries
--   4. add compound index for comment thread ordering
-- All steps are idempotent so they can run safely on prod or local.

BEGIN;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY internship_id, applicant_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM applications
)
DELETE FROM applications WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_internship_applicant_unique;
ALTER TABLE applications
  ADD CONSTRAINT applications_internship_applicant_unique
  UNIQUE (internship_id, applicant_id);

CREATE INDEX IF NOT EXISTS applications_internship_status_idx
  ON applications USING btree (internship_id, status);

CREATE INDEX IF NOT EXISTS comments_workspace_created_idx
  ON comments USING btree (workspace_id, created_at DESC);

COMMIT;
