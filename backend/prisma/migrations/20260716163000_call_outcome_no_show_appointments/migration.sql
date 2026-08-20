ALTER TYPE "lead_status" ADD VALUE IF NOT EXISTS 'no_show';

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "appointment_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "appointment_treatment_id" UUID,
  ADD COLUMN IF NOT EXISTS "appointment_note" TEXT;

CREATE INDEX IF NOT EXISTS "leads_appointment_at_idx" ON "leads"("appointment_at");
CREATE INDEX IF NOT EXISTS "leads_appointment_treatment_id_idx" ON "leads"("appointment_treatment_id");
