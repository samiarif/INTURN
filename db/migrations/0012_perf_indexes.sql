-- Perf optimization · indexes on frequently-queried FK / status columns.
-- These columns were being seq-scanned (5+ call sites each). Idempotent.

BEGIN;

-- organizations.owner_id — queried in session resolution, project ownership,
-- workspace lookups, admin queries.
CREATE INDEX IF NOT EXISTS organizations_owner_idx ON organizations (owner_id);

-- internships.organization_id — supervisor sidebar + org internship lists.
CREATE INDEX IF NOT EXISTS internships_organization_idx ON internships (organization_id);

-- workspaces.status — admin stats COUNT(*) WHERE status = 'active'.
CREATE INDEX IF NOT EXISTS workspaces_status_idx ON workspaces (status);

COMMIT;
