CREATE INDEX IF NOT EXISTS "leads_owner_agent_id_status_idx" ON "leads"("owner_agent_id", "status");
CREATE INDEX IF NOT EXISTS "leads_owner_agent_id_created_at_idx" ON "leads"("owner_agent_id", "created_at");
