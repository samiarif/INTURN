CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internship_bookmarks" (
	"intern_id" uuid NOT NULL,
	"internship_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "internship_bookmarks_intern_id_internship_id_pk" PRIMARY KEY("intern_id","internship_id")
);
--> statement-breakpoint
CREATE TABLE "internship_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"internship_id" uuid NOT NULL,
	"intern_user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"generated_by" uuid NOT NULL,
	"share_token" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"pdf_blob_url" text,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"metadata" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "revision_history" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "internships" ADD COLUMN "deliverables" jsonb;--> statement-breakpoint
ALTER TABLE "internships" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "goals" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "phases" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_bookmarks" ADD CONSTRAINT "internship_bookmarks_intern_id_users_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_bookmarks" ADD CONSTRAINT "internship_bookmarks_internship_id_internships_id_fk" FOREIGN KEY ("internship_id") REFERENCES "public"."internships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_records" ADD CONSTRAINT "internship_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_records" ADD CONSTRAINT "internship_records_internship_id_internships_id_fk" FOREIGN KEY ("internship_id") REFERENCES "public"."internships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_records" ADD CONSTRAINT "internship_records_intern_user_id_users_id_fk" FOREIGN KEY ("intern_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_records" ADD CONSTRAINT "internship_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_records" ADD CONSTRAINT "internship_records_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_idx" ON "audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "community_comments_post_created_idx" ON "community_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "community_comments_author_idx" ON "community_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "community_posts_status_activity_idx" ON "community_posts" USING btree ("status",last_activity_at DESC);--> statement-breakpoint
CREATE INDEX "community_posts_author_idx" ON "community_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "internship_bookmarks_intern_idx" ON "internship_bookmarks" USING btree ("intern_id");--> statement-breakpoint
CREATE UNIQUE INDEX "internship_records_share_token_idx" ON "internship_records" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "internship_records_workspace_idx" ON "internship_records" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "internship_records_intern_idx" ON "internship_records" USING btree ("intern_user_id");--> statement-breakpoint
CREATE INDEX "internship_records_org_idx" ON "internship_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_id",created_at DESC);--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id") WHERE read_at IS NULL;--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_subject_idx" ON "reports" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "applications_internship_status_idx" ON "applications" USING btree ("internship_id","status");--> statement-breakpoint
CREATE INDEX "comments_workspace_created_idx" ON "comments" USING btree ("workspace_id",created_at DESC);--> statement-breakpoint
CREATE INDEX "internships_organization_idx" ON "internships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "internships_search_vector_idx" ON "internships" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "organizations_owner_idx" ON "organizations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "workspaces_status_idx" ON "workspaces" USING btree ("status");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_internship_applicant_unique" UNIQUE("internship_id","applicant_id");