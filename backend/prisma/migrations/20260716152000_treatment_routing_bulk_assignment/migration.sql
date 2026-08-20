ALTER TYPE "assignment_method" ADD VALUE IF NOT EXISTS 'treatment_based';

CREATE TABLE IF NOT EXISTS "treatment_agent_routing" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "treatment_id" UUID NOT NULL,
  "agent_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "treatment_agent_routing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "treatment_agent_routing_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "treatment_agent_routing_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "treatment_agent_routing_treatment_id_agent_id_key" ON "treatment_agent_routing"("treatment_id", "agent_id");
CREATE INDEX IF NOT EXISTS "treatment_agent_routing_treatment_id_idx" ON "treatment_agent_routing"("treatment_id");
CREATE INDEX IF NOT EXISTS "treatment_agent_routing_agent_id_idx" ON "treatment_agent_routing"("agent_id");
