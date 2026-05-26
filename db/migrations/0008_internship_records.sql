-- Sprint D · internship_records — end-of-internship PDF records
-- with public share tokens. Idempotent; safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS internship_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  intern_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  share_token text NOT NULL,
  snapshot jsonb NOT NULL,
  pdf_blob_url text,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS internship_records_share_token_idx
  ON internship_records (share_token);

CREATE INDEX IF NOT EXISTS internship_records_workspace_idx
  ON internship_records (workspace_id);

CREATE INDEX IF NOT EXISTS internship_records_intern_idx
  ON internship_records (intern_user_id);

CREATE INDEX IF NOT EXISTS internship_records_org_idx
  ON internship_records (organization_id);

COMMIT;
