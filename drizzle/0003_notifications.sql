CREATE TYPE "public"."email_status" AS ENUM('NOT_REQUIRED', 'PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('BILL_REMINDER', 'BILL_ESCALATION', 'BILL_OVERDUE', 'BILL_ASSIGNED', 'BILL_PAID', 'BUDGET_WARNING', 'BUDGET_EXCEEDED', 'SAVINGS_TARGET_REACHED', 'BUDGET_CARRIED_OVER', 'INVITE_ACCEPTED');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"link" varchar(300),
	"dedupe_key" varchar(200) NOT NULL,
	"read_at" timestamp with time zone,
	"email_status" "email_status" DEFAULT 'NOT_REQUIRED' NOT NULL,
	"email_attempts" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");