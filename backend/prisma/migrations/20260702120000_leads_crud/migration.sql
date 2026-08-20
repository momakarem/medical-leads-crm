CREATE TYPE "lead_status" AS ENUM ('new', 'contacted', 'interested', 'not_interested', 'booked', 'paid', 'wrong_number', 'job_seeker');
CREATE TYPE "activity_type" AS ENUM ('created', 'updated', 'deleted', 'status_changed');

CREATE TABLE "treatments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(150) NOT NULL,
  "phone" VARCHAR(25) NOT NULL,
  "source_channel" VARCHAR(100) NOT NULL,
  "campaign_name" VARCHAR(200),
  "treatment_id" UUID,
  "status" "lead_status" NOT NULL DEFAULT 'new',
  "owner_agent_id" UUID,
  "created_by" UUID NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "activity_type" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "treatments_name_key" ON "treatments"("name");
CREATE INDEX "treatments_name_idx" ON "treatments"("name");
CREATE INDEX "treatments_is_active_idx" ON "treatments"("is_active");
CREATE INDEX "leads_phone_idx" ON "leads"("phone");
CREATE INDEX "leads_name_idx" ON "leads"("name");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_treatment_id_idx" ON "leads"("treatment_id");
CREATE INDEX "leads_owner_agent_id_idx" ON "leads"("owner_agent_id");
CREATE INDEX "leads_created_by_idx" ON "leads"("created_by");
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");
CREATE INDEX "leads_deleted_at_idx" ON "leads"("deleted_at");
CREATE INDEX "activities_lead_id_idx" ON "activities"("lead_id");
CREATE INDEX "activities_user_id_idx" ON "activities"("user_id");
CREATE INDEX "activities_type_idx" ON "activities"("type");
CREATE INDEX "activities_created_at_idx" ON "activities"("created_at");

ALTER TABLE "leads" ADD CONSTRAINT "leads_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_agent_id_fkey" FOREIGN KEY ("owner_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
