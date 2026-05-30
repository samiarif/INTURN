-- 0017: university product foundation.
--   * organizations.kind discriminator ('company' default | 'university')
--   * academic_reports table (rapport académique; modeled on deliverables, NO workspace_id)
-- organization_members.role gains 'student' in the Drizzle TS enum only — there is
-- NO DB CHECK on that column (see 0015_organization_members.sql), so no ALTER here.
-- comments.report_id deferred to Plan 2 (workspace_id NOT NULL conflict).
-- Additive, idempotent (safe to re-run). Hand-rolled — the drizzle journal is out
-- of sync (see scripts/migrate.ts + db/migrations/README.md).

BEGIN;

-- 1. organizations.kind — existing rows backfill to 'company' via the default.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'company';

-- 2. academic_reports
CREATE TABLE IF NOT EXISTS academic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  internship_id uuid REFERENCES internships(id) ON DELETE SET NULL,
  title text,
  description text,
  file_url text,
  file_name text,
  file_type text,
  status text NOT NULL DEFAULT 'draft',
  feedback text,
  version integer NOT NULL DEFAULT 1,
  submitted_at timestamp,
  due_date date,
  revision_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academic_reports_university_status_idx
  ON academic_reports (university_org_id, status);
CREATE INDEX IF NOT EXISTS academic_reports_student_idx
  ON academic_reports (student_user_id);

COMMIT;
