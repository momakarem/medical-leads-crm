ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'follow_up_created';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'follow_up_completed';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'follow_up_cancelled';

CREATE TYPE "follow_up_status" AS ENUM ('pending', 'completed', 'cancelled');

CREATE TABLE "follow_ups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "scheduled_date" DATE NOT NULL,
  "scheduled_time" VARCHAR(5) NOT NULL,
  "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "follow_up_status" NOT NULL DEFAULT 'pending',
  "note" TEXT,
  "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "follow_ups_lead_id_idx" ON "follow_ups"("lead_id");
CREATE INDEX "follow_ups_user_id_idx" ON "follow_ups"("user_id");
CREATE INDEX "follow_ups_status_idx" ON "follow_ups"("status");
CREATE INDEX "follow_ups_scheduled_at_idx" ON "follow_ups"("scheduled_at");
CREATE INDEX "follow_ups_status_scheduled_at_idx" ON "follow_ups"("status", "scheduled_at");
CREATE INDEX "follow_ups_lead_id_status_idx" ON "follow_ups"("lead_id", "status");

ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;