ALTER TYPE "lead_status" RENAME TO "lead_status_old";

CREATE TYPE "lead_status" AS ENUM (
  'new',
  'no_answer',
  'follow_up',
  'interested',
  'not_interested',
  'booked',
  'showed_up',
  'paid'
);

ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "leads"
ALTER COLUMN "status" TYPE "lead_status"
USING (
  CASE "status"::text
    WHEN 'new' THEN 'new'
    WHEN 'contacted' THEN 'interested'
    WHEN 'interested' THEN 'interested'
    WHEN 'not_interested' THEN 'not_interested'
    WHEN 'booked' THEN 'booked'
    WHEN 'paid' THEN 'paid'
    WHEN 'wrong_number' THEN 'not_interested'
    WHEN 'job_seeker' THEN 'not_interested'
    ELSE 'new'
  END
)::"lead_status";

ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new';
DROP TYPE "lead_status_old";

CREATE TABLE "lead_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "old_status" "lead_status" NOT NULL,
  "new_status" "lead_status" NOT NULL,
  "changed_by" UUID NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_status_history_lead_id_idx" ON "lead_status_history"("lead_id");
CREATE INDEX "lead_status_history_changed_by_idx" ON "lead_status_history"("changed_by");
CREATE INDEX "lead_status_history_created_at_idx" ON "lead_status_history"("created_at");

ALTER TABLE "lead_status_history" ADD CONSTRAINT "lead_status_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_status_history" ADD CONSTRAINT "lead_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;