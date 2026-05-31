-- 0019: deliverable dependencies — cross-intern "feeds" edges within a project.
--   * deliverable_dependencies (upstream_id feeds downstream_id; both deliverables,
--     within one project). Powers the Project Command Center stuck-flow signal +
--     the intern-side upstream/downstream awareness chips. Awareness only — no
--     gating. Cycle prevention is application-layer (see modules/deliverables/
--     dependencies.ts); the DB only blocks self-edges + duplicate edges.
-- Additive, idempotent (safe to re-run). Hand-rolled — the drizzle journal is out
-- of sync (see scripts/migrate.ts + db/migrations/README.md).

BEGIN;

CREATE TABLE IF NOT EXISTS deliverable_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upstream_id uuid NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  downstream_id uuid NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT deliverable_dependencies_no_self CHECK (upstream_id <> downstream_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS deliverable_dependencies_edge_idx
  ON deliverable_dependencies (upstream_id, downstream_id);
CREATE INDEX IF NOT EXISTS deliverable_dependencies_project_idx
  ON deliverable_dependencies (project_id);
CREATE INDEX IF NOT EXISTS deliverable_dependencies_downstream_idx
  ON deliverable_dependencies (downstream_id);
CREATE INDEX IF NOT EXISTS deliverable_dependencies_upstream_idx
  ON deliverable_dependencies (upstream_id);

COMMIT;
