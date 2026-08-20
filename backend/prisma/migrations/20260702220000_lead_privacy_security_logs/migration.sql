-- Lead privacy enforcement support indexes.
CREATE INDEX IF NOT EXISTS "leads_owner_agent_id_status_idx" ON "leads"("owner_agent_id", "status");
CREATE INDEX IF NOT EXISTS "leads_owner_agent_id_created_at_idx" ON "leads"("owner_agent_id", "created_at");

CREATE TABLE IF NOT EXISTS "security_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "lead_id" UUID,
  "action" VARCHAR(120) NOT NULL,
  "ip_address" VARCHAR(80),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "security_logs"
  ADD CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security_logs"
  ADD CONSTRAINT "security_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "security_logs_user_id_idx" ON "security_logs"("user_id");
CREATE INDEX IF NOT EXISTS "security_logs_lead_id_idx" ON "security_logs"("lead_id");
CREATE INDEX IF NOT EXISTS "security_logs_action_idx" ON "security_logs"("action");
CREATE INDEX IF NOT EXISTS "security_logs_created_at_idx" ON "security_logs"("created_at");