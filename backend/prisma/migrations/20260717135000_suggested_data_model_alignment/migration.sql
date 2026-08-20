-- Align schema with suggested medical CRM data model without removing existing capabilities.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" VARCHAR(5) NOT NULL DEFAULT 'en';
CREATE INDEX IF NOT EXISTS "users_preferred_language_idx" ON "users"("preferred_language");

ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "name_ar" VARCHAR(150);
CREATE INDEX IF NOT EXISTS "treatments_name_ar_idx" ON "treatments"("name_ar");

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN NOT NULL DEFAULT false;
UPDATE "leads" SET "is_private" = true WHERE "owner_agent_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "leads_is_private_idx" ON "leads"("is_private");

ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "outcome" VARCHAR(120);
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "new_status" "lead_status";
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "scheduled_for" TIMESTAMPTZ(3);
CREATE INDEX IF NOT EXISTS "activities_outcome_idx" ON "activities"("outcome");
CREATE INDEX IF NOT EXISTS "activities_new_status_idx" ON "activities"("new_status");
CREATE INDEX IF NOT EXISTS "activities_scheduled_for_idx" ON "activities"("scheduled_for");
