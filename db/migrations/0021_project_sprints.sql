-- 0021: project_sprints — company-authored sprint blueprint for a project.
-- Each row is a sprint with an ordered task blueprint (copied into intern
-- workspaces in Plan 2). Additive, idempotent.
BEGIN;

CREATE TABLE IF NOT EXISTS project_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text,
  order_index integer NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  task_blueprint jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_sprints_project_order_idx
  ON project_sprints(project_id, order_index);

COMMIT;
