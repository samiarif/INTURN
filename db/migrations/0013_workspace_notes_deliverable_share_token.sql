-- S1 · workspace_notes table + deliverables.share_token. Idempotent.

BEGIN;

-- Author-private notes scoped to a workspace.
CREATE TABLE IF NOT EXISTS workspace_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamp DEFAULT now() NOT NULL,
  updated_at  timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS workspace_notes_ws_author_idx
  ON workspace_notes (workspace_id, author_id);

-- Nullable share token on deliverables — generated on first "Share link" click.
-- Multiple NULLs are allowed by Postgres; only non-null tokens must be unique.
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS share_token text;

CREATE UNIQUE INDEX IF NOT EXISTS deliverables_share_token_idx
  ON deliverables (share_token)
  WHERE share_token IS NOT NULL;

COMMIT;
