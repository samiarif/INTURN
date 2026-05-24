-- Performance: hot-path indexes for workspace + marketplace queries.
-- Idempotent so it can run safely on dbs already synced via `db:push`.

-- Activity feed: target_id + created_at DESC for fast workspace event scans.
DROP INDEX IF EXISTS "events_target_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_target_created_idx" ON "events" USING btree ("target_id", created_at DESC);--> statement-breakpoint

-- Workspace authz lookup: WHERE supervisor_ids @> '[user_id]'::jsonb.
CREATE INDEX IF NOT EXISTS "projects_supervisors_gin_idx" ON "projects" USING gin ("supervisor_ids");--> statement-breakpoint

-- Marketplace listing: WHERE status='published' ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS "internships_status_created_idx" ON "internships" USING btree ("status", created_at DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internships_project_idx" ON "internships" USING btree ("project_id");--> statement-breakpoint

-- Workspace FK lookups (intern dashboard, company side).
CREATE INDEX IF NOT EXISTS "workspaces_intern_idx" ON "workspaces" USING btree ("intern_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_organization_idx" ON "workspaces" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_internship_idx" ON "workspaces" USING btree ("internship_id");--> statement-breakpoint

-- Kanban board grouping + ordering.
CREATE INDEX IF NOT EXISTS "tasks_workspace_status_idx" ON "tasks" USING btree ("workspace_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workspace_order_idx" ON "tasks" USING btree ("workspace_id", "order");--> statement-breakpoint

-- Deliverables tab filters.
CREATE INDEX IF NOT EXISTS "deliverables_workspace_status_idx" ON "deliverables" USING btree ("workspace_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deliverables_task_idx" ON "deliverables" USING btree ("task_id");
