-- Sprint B Phase 1: deliverable revision history.
-- Adds a jsonb column to deliverables that stores past version snapshots
-- (file, note, status, reviewer feedback) so the new master/detail page can
-- render the version stack. Current row keeps representing the latest version;
-- older versions live in this array, newest-first when read.
-- Idempotent.

BEGIN;

ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS revision_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
