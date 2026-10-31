CREATE TABLE "call_voicemail" (
	"call_id" uuid PRIMARY KEY NOT NULL,
	"action" text,
	"assistant_ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_voicemail" ADD CONSTRAINT "call_voicemail_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;