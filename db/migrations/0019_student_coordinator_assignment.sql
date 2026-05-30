-- 0019: student_coordinator_assignment — per-student encadrant assignment.
-- Links a student organization_members row to the coordinator (owner=head or
-- admin=encadrant) who supervises them. Nullable = head-owned (no explicit
-- assignment needed). Backfills existing students to their org's owner so
-- none go invisible on first deploy.
-- Additive, idempotent (safe to re-run). Hand-rolled — the drizzle journal is out
-- of sync (see scripts/migrate.ts + db/migrations/README.md).

BEGIN;

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS assigned_coordinator_id uuid
  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS org_members_assigned_coordinator_idx
  ON organization_members(assigned_coordinator_id)
  WHERE assigned_coordinator_id IS NOT NULL;

-- Backfill existing students to their org's head so none go invisible.
UPDATE organization_members sm
  SET assigned_coordinator_id = o.owner_id
  FROM organizations o
  WHERE sm.organization_id = o.id
    AND o.kind = 'university'
    AND sm.role = 'student'
    AND sm.assigned_coordinator_id IS NULL
    AND o.owner_id IS NOT NULL;

COMMIT;
