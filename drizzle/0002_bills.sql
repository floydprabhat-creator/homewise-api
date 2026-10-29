CREATE TYPE "public"."bill_amount_type" AS ENUM('FIXED', 'VARIABLE');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."bill_frequency" AS ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."occurrence_status" AS ENUM('UNPAID', 'PAID');--> statement-breakpoint
CREATE TABLE "bill_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"amount_due" numeric(12, 2) NOT NULL,
	"assignee_id" uuid,
	"status" "occurrence_status" DEFAULT 'UNPAID' NOT NULL,
	"paid_amount" numeric(12, 2),
	"paid_at" date,
	"paid_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"amount_type" "bill_amount_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"frequency" "bill_frequency" NOT NULL,
	"first_due_date" date NOT NULL,
	"anchor_day" smallint NOT NULL,
	"remind_days_before" smallint DEFAULT 3 NOT NULL,
	"default_assignee_id" uuid,
	"status" "bill_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_default_assignee_id_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bill_occurrences_bill_due_idx" ON "bill_occurrences" USING btree ("bill_id","due_date");--> statement-breakpoint
CREATE INDEX "bill_occurrences_household_due_idx" ON "bill_occurrences" USING btree ("household_id","due_date");--> statement-breakpoint
CREATE INDEX "bills_household_idx" ON "bills" USING btree ("household_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_occurrence_id_bill_occurrences_id_fk" FOREIGN KEY ("bill_occurrence_id") REFERENCES "public"."bill_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_bill_occurrence_idx" ON "transactions" USING btree ("bill_occurrence_id");