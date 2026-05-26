-- Sprint D · notifications table for in-app bell.
-- Idempotent; safe to re-run on prod via pnpm db:migrate.

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  body text NOT NULL,
  href text,
  metadata jsonb,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications USING btree (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications USING btree (recipient_id)
  WHERE read_at IS NULL;

COMMIT;
