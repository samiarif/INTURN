-- Sprint D · reports (user reclamations) + audit_logs (admin actions).
-- Idempotent; safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  reason text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_status_created_idx
  ON reports (status, created_at);
CREATE INDEX IF NOT EXISTS reports_subject_idx
  ON reports (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS reports_reporter_idx
  ON reports (reporter_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx
  ON audit_logs (actor_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx
  ON audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx
  ON audit_logs (action, created_at);

COMMIT;
