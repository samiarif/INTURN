-- 0020: one workspace per (intern, internship).
--   Backstops the application-layer idempotency guard in
--   modules/applications/service.ts#acceptApplication so a concurrent
--   double-accept cannot create twin active workspaces (which would split the
--   intern's deliverables/tasks/events across two workspaces). The race now
--   safely fails the losing insert; the supervisor's retry reuses the workspace.
-- Additive, idempotent (safe to re-run). Hand-rolled — the drizzle journal is
-- out of sync (see scripts/migrate.ts + db/migrations/README.md).
--
-- NOTE: if duplicate (intern_id, internship_id) workspaces already exist, this
-- index creation fails loudly — resolve the duplicate first, then re-run.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_intern_internship_idx
  ON workspaces (intern_id, internship_id);

COMMIT;
