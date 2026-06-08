-- 0022: tasks.sprint_id — link a workspace task to a project sprint (nullable).
-- Null = "Unsorted" (existing tasks pre-seeding, or tasks the intern parks
-- outside any sprint). ON DELETE SET NULL so deleting a sprint preserves the
-- tasks. Additive, idempotent.
BEGIN;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sprint_id uuid
  REFERENCES project_sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_workspace_sprint_idx
  ON tasks(workspace_id, sprint_id);

COMMIT;
