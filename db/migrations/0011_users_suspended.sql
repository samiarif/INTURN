-- Round 5 · admin moderation of users (suspend/unsuspend). Idempotent.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at timestamp;

CREATE INDEX IF NOT EXISTS users_suspended_idx ON users (suspended_at) WHERE suspended_at IS NOT NULL;

COMMIT;
