ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_assigned';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_reassigned';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_unassigned';

CREATE TABLE "lead_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "previous_agent_id" UUID,
  "new_agent_id" UUID,
  "assigned_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_assignments_lead_id_idx" ON "lead_assignments"("lead_id");
CREATE INDEX "lead_assignments_assigned_by_idx" ON "lead_assignments"("assigned_by");
CREATE INDEX "lead_assignments_created_at_idx" ON "lead_assignments"("created_at");
CREATE INDEX "lead_assignments_previous_agent_id_idx" ON "lead_assignments"("previous_agent_id");
CREATE INDEX "lead_assignments_new_agent_id_idx" ON "lead_assignments"("new_agent_id");

ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_previous_agent_id_fkey" FOREIGN KEY ("previous_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_new_agent_id_fkey" FOREIGN KEY ("new_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;