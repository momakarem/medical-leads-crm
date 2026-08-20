ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'first_contact_recorded';

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "first_contacted_at" TIMESTAMPTZ(3),
ADD COLUMN IF NOT EXISTS "speed_to_contact_seconds" INTEGER;

CREATE INDEX IF NOT EXISTS "leads_first_contacted_at_idx" ON "leads"("first_contacted_at");
CREATE INDEX IF NOT EXISTS "leads_speed_to_contact_seconds_idx" ON "leads"("speed_to_contact_seconds");
CREATE INDEX IF NOT EXISTS "leads_owner_agent_id_first_contacted_at_idx" ON "leads"("owner_agent_id", "first_contacted_at");
CREATE INDEX IF NOT EXISTS "leads_owner_agent_id_speed_to_contact_seconds_idx" ON "leads"("owner_agent_id", "speed_to_contact_seconds");
