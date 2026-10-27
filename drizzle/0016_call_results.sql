CREATE TABLE "agent_call_results" (
	"agent_id" uuid PRIMARY KEY NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"email" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"insight_group_id" text,
	"summary_insight_id" text,
	"fields_insight_id" text,
	"insights_hash" text,
	"test_emails_at" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_results" (
	"call_id" uuid PRIMARY KEY NOT NULL,
	"fields" jsonb,
	"values" jsonb,
	"badge" text,
	"email_status" text NOT NULL,
	"emailed_to" jsonb,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_call_results" ADD CONSTRAINT "agent_call_results_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_results" ADD CONSTRAINT "call_results_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;