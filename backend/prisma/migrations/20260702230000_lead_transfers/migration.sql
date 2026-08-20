CREATE TABLE IF NOT EXISTS "lead_transfers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "previous_agent_id" UUID,
  "new_agent_id" UUID NOT NULL,
  "transferred_by" UUID NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_transfers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lead_transfers"
  ADD CONSTRAINT "lead_transfers_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_transfers"
  ADD CONSTRAINT "lead_transfers_previous_agent_id_fkey" FOREIGN KEY ("previous_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lead_transfers"
  ADD CONSTRAINT "lead_transfers_new_agent_id_fkey" FOREIGN KEY ("new_agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_transfers"
  ADD CONSTRAINT "lead_transfers_transferred_by_fkey" FOREIGN KEY ("transferred_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "lead_transfers_lead_id_idx" ON "lead_transfers"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_transfers_previous_agent_id_idx" ON "lead_transfers"("previous_agent_id");
CREATE INDEX IF NOT EXISTS "lead_transfers_new_agent_id_idx" ON "lead_transfers"("new_agent_id");
CREATE INDEX IF NOT EXISTS "lead_transfers_transferred_by_idx" ON "lead_transfers"("transferred_by");
CREATE INDEX IF NOT EXISTS "lead_transfers_created_at_idx" ON "lead_transfers"("created_at");