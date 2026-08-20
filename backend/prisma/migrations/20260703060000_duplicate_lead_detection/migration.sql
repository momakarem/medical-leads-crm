ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'duplicate_detected';

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "normalized_phone" VARCHAR(25),
  ADD COLUMN IF NOT EXISTS "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "duplicate_of_lead_id" UUID;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_duplicate_of_lead_id_fkey"
  FOREIGN KEY ("duplicate_of_lead_id") REFERENCES "leads"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lead_duplicates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "original_lead_id" UUID NOT NULL,
  "duplicate_lead_id" UUID NOT NULL,
  "detected_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lead_duplicates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_duplicates_original_lead_id_fkey"
    FOREIGN KEY ("original_lead_id") REFERENCES "leads"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lead_duplicates_duplicate_lead_id_fkey"
    FOREIGN KEY ("duplicate_lead_id") REFERENCES "leads"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lead_duplicates_detected_by_fkey"
    FOREIGN KEY ("detected_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "leads_normalized_phone_idx" ON "leads"("normalized_phone");
CREATE INDEX "leads_normalized_phone_created_at_idx" ON "leads"("normalized_phone", "created_at");
CREATE INDEX "leads_is_duplicate_idx" ON "leads"("is_duplicate");
CREATE INDEX "leads_duplicate_of_lead_id_idx" ON "leads"("duplicate_of_lead_id");
CREATE INDEX "lead_duplicates_original_lead_id_idx" ON "lead_duplicates"("original_lead_id");
CREATE INDEX "lead_duplicates_duplicate_lead_id_idx" ON "lead_duplicates"("duplicate_lead_id");
CREATE INDEX "lead_duplicates_detected_by_idx" ON "lead_duplicates"("detected_by");
CREATE INDEX "lead_duplicates_created_at_idx" ON "lead_duplicates"("created_at");
