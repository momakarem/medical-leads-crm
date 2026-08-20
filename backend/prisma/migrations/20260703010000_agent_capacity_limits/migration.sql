ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "max_active_leads" INTEGER NOT NULL DEFAULT 50;

ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'agent_capacity_reached';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'agent_capacity_updated';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_unassigned_no_capacity';

CREATE INDEX IF NOT EXISTS "users_max_active_leads_idx" ON "users"("max_active_leads");
CREATE INDEX IF NOT EXISTS "users_role_is_active_max_active_leads_idx" ON "users"("role", "is_active", "max_active_leads");
CREATE INDEX IF NOT EXISTS "leads_owner_agent_id_status_capacity_idx" ON "leads"("owner_agent_id", "status") WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "agent_capacity_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL,
  "changed_by" UUID,
  "type" VARCHAR(80) NOT NULL,
  "old_max_active_leads" INTEGER,
  "new_max_active_leads" INTEGER,
  "active_leads" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_capacity_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "agent_capacity_history"
  ADD CONSTRAINT "agent_capacity_history_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_capacity_history"
  ADD CONSTRAINT "agent_capacity_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "agent_capacity_history_agent_id_idx" ON "agent_capacity_history"("agent_id");
CREATE INDEX IF NOT EXISTS "agent_capacity_history_changed_by_idx" ON "agent_capacity_history"("changed_by");
CREATE INDEX IF NOT EXISTS "agent_capacity_history_type_idx" ON "agent_capacity_history"("type");
CREATE INDEX IF NOT EXISTS "agent_capacity_history_created_at_idx" ON "agent_capacity_history"("created_at");