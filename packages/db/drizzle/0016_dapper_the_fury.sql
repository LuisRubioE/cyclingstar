ALTER TABLE "contracts" ADD COLUMN "pay_housing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "pay_housing" boolean DEFAULT false NOT NULL;