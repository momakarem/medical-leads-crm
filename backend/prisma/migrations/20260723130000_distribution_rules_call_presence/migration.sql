ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'call_started';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'call_ended';

CREATE TABLE IF NOT EXISTS "assignment_distribution_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(150) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "source_channel" VARCHAR(100),
  "campaign_name" VARCHAR(200),
  "ad_name" VARCHAR(200),
  "form_id" VARCHAR(120),
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_distribution_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "assignment_distribution_allocations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_id" UUID NOT NULL,
  "agent_id" UUID NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "assigned_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_distribution_allocations_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "assignment_distribution_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "assignment_distribution_allocations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "assignment_distribution_allocations_rule_agent_unique" UNIQUE ("rule_id", "agent_id")
);

CREATE TABLE IF NOT EXISTS "lead_call_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "agent_id" UUID NOT NULL,
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMPTZ(3),
  "note" TEXT,
  CONSTRAINT "lead_call_sessions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lead_call_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "assignment_distribution_rules_is_active_priority_idx" ON "assignment_distribution_rules"("is_active", "priority");
CREATE INDEX IF NOT EXISTS "assignment_distribution_rules_source_channel_idx" ON "assignment_distribution_rules"("source_channel");
CREATE INDEX IF NOT EXISTS "assignment_distribution_rules_campaign_name_idx" ON "assignment_distribution_rules"("campaign_name");
CREATE INDEX IF NOT EXISTS "assignment_distribution_rules_ad_name_idx" ON "assignment_distribution_rules"("ad_name");
CREATE INDEX IF NOT EXISTS "assignment_distribution_rules_form_id_idx" ON "assignment_distribution_rules"("form_id");
CREATE INDEX IF NOT EXISTS "assignment_distribution_allocations_rule_id_idx" ON "assignment_distribution_allocations"("rule_id");
CREATE INDEX IF NOT EXISTS "assignment_distribution_allocations_agent_id_idx" ON "assignment_distribution_allocations"("agent_id");
CREATE INDEX IF NOT EXISTS "assignment_distribution_allocations_weight_idx" ON "assignment_distribution_allocations"("weight");
CREATE INDEX IF NOT EXISTS "assignment_distribution_allocations_assigned_count_idx" ON "assignment_distribution_allocations"("assigned_count");
CREATE INDEX IF NOT EXISTS "lead_call_sessions_lead_id_idx" ON "lead_call_sessions"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_call_sessions_agent_id_idx" ON "lead_call_sessions"("agent_id");
CREATE INDEX IF NOT EXISTS "lead_call_sessions_ended_at_idx" ON "lead_call_sessions"("ended_at");
CREATE INDEX IF NOT EXISTS "lead_call_sessions_started_at_idx" ON "lead_call_sessions"("started_at");
CREATE INDEX IF NOT EXISTS "lead_call_sessions_lead_id_ended_at_idx" ON "lead_call_sessions"("lead_id", "ended_at");
CREATE INDEX IF NOT EXISTS "lead_call_sessions_agent_id_ended_at_idx" ON "lead_call_sessions"("agent_id", "ended_at");
