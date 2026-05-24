-- Sprint B bookmarks: per-intern internship wishlist. Composite PK on
-- (intern_id, internship_id) makes the toggle idempotent. Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS internship_bookmarks (
  intern_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (intern_id, internship_id)
);

CREATE INDEX IF NOT EXISTS internship_bookmarks_intern_idx
  ON internship_bookmarks (intern_id);

COMMIT;
