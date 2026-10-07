CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"content" text,
	"storage_path" varchar,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifacts_user_id_idx" ON "artifacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artifacts_conversation_id_idx" ON "artifacts" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "artifacts_task_id_idx" ON "artifacts" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "artifacts_created_at_idx" ON "artifacts" USING btree ("created_at");