DO $$ BEGIN
  CREATE TYPE "assignment_method" AS ENUM ('manual', 'round_robin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_transferred';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_auto_assigned';

ALTER TABLE "lead_assignments"
  ADD COLUMN IF NOT EXISTS "assignment_type" VARCHAR(50) NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS "round_robin_state" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(80) NOT NULL,
  "last_agent_id" UUID,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "round_robin_state_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "round_robin_state_key_key" ON "round_robin_state"("key");
CREATE INDEX IF NOT EXISTS "round_robin_state_last_agent_id_idx" ON "round_robin_state"("last_agent_id");

ALTER TABLE "round_robin_state"
  ADD CONSTRAINT "round_robin_state_last_agent_id_fkey" FOREIGN KEY ("last_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "assignment_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignment_method" "assignment_method" NOT NULL DEFAULT 'round_robin',
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_settings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "assignment_settings_assignment_method_idx" ON "assignment_settings"("assignment_method");
CREATE INDEX IF NOT EXISTS "users_role_is_active_idx" ON "users"("role", "is_active");
CREATE INDEX IF NOT EXISTS "lead_assignments_assignment_type_idx" ON "lead_assignments"("assignment_type");

INSERT INTO "assignment_settings" ("assignment_method", "is_enabled")
SELECT 'round_robin', true
WHERE NOT EXISTS (SELECT 1 FROM "assignment_settings");

INSERT INTO "round_robin_state" ("key")
VALUES ('default')
ON CONFLICT ("key") DO NOTHING;