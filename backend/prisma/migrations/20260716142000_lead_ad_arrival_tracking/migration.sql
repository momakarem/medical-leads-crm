ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "ad_name" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "arrival_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "leads_ad_name_idx" ON "leads"("ad_name");
CREATE INDEX IF NOT EXISTS "leads_arrival_timestamp_idx" ON "leads"("arrival_timestamp");
