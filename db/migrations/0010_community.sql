-- Sprint D · community v1: intern feed (posts + comments). Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  comment_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_posts_status_activity_idx
  ON community_posts (status, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_author_idx
  ON community_posts (author_id);

CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_comments_post_created_idx
  ON community_comments (post_id, created_at);

CREATE INDEX IF NOT EXISTS community_comments_author_idx
  ON community_comments (author_id);

COMMIT;
