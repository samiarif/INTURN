-- Marketplace full-text search.
-- Adds a `search_vector` tsvector column derived from title + description + sector,
-- backfills existing rows, sets a trigger to maintain it on insert/update, and
-- creates a GIN index on it.
-- Idempotent.

BEGIN;

ALTER TABLE internships ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION internships_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.sector, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS internships_search_vector_trigger ON internships;
CREATE TRIGGER internships_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, sector, description
  ON internships
  FOR EACH ROW EXECUTE FUNCTION internships_search_vector_update();

-- Backfill existing rows.
UPDATE internships SET search_vector =
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(sector, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS internships_search_vector_idx
  ON internships USING gin (search_vector);

COMMIT;
