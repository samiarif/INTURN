-- Sprint 3: project goals + phases, internship deliverables.
-- Adds three jsonb columns to back the new wireframe form fields.
-- Idempotent.

BEGIN;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS goals jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS phases jsonb;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS deliverables jsonb;

COMMIT;
