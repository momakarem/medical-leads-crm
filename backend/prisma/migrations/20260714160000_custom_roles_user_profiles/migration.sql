CREATE TABLE IF NOT EXISTS "custom_roles" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "base_role" "user_role" NOT NULL,
  "permissions" JSONB NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "custom_roles_name_key" ON "custom_roles"("name");
CREATE INDEX IF NOT EXISTS "custom_roles_base_role_idx" ON "custom_roles"("base_role");
CREATE INDEX IF NOT EXISTS "custom_roles_is_system_idx" ON "custom_roles"("is_system");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "custom_role_id" UUID;
CREATE INDEX IF NOT EXISTS "users_custom_role_id_idx" ON "users"("custom_role_id");
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users"("deleted_at");

DO $$
BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "custom_roles" ("id", "name", "description", "base_role", "permissions", "is_system") VALUES
('00000000-0000-0000-0000-0000000000a1', 'Admin', 'Full system access, audit visibility, settings and integrations.', 'admin', '{"Leads":["View","Create","Update","Delete","Assign","Transfer","Export"],"Dashboard":["View"],"Users":["View","Create","Update","Delete"],"Roles":["Manage"],"Treatments":["View","Create","Update","Delete"],"Integrations":["Manage"],"Reports":["View","Export"],"Audit Logs":["View"],"Settings":["Update"]}'::jsonb, true),
('00000000-0000-0000-0000-0000000000a2', 'Manager', 'Team operations, lead management, assignments and reporting access.', 'manager', '{"Leads":["View","Create","Update","Assign","Transfer","Export"],"Dashboard":["View"],"Users":["View","Update"],"Roles":[],"Treatments":["View","Create","Update"],"Integrations":[],"Reports":["View"],"Audit Logs":["View"],"Settings":[]}'::jsonb, true),
('00000000-0000-0000-0000-0000000000a3', 'Agent', 'Daily lead handling, follow-ups and owned lead visibility.', 'agent', '{"Leads":["View","Create","Update"],"Dashboard":["View"],"Users":[],"Roles":[],"Treatments":[],"Integrations":[],"Reports":[],"Audit Logs":[],"Settings":[]}'::jsonb, true)
ON CONFLICT ("name") DO NOTHING;

UPDATE "users" SET "custom_role_id" = '00000000-0000-0000-0000-0000000000a1' WHERE "role" = 'admin' AND "custom_role_id" IS NULL;
UPDATE "users" SET "custom_role_id" = '00000000-0000-0000-0000-0000000000a2' WHERE "role" = 'manager' AND "custom_role_id" IS NULL;
UPDATE "users" SET "custom_role_id" = '00000000-0000-0000-0000-0000000000a3' WHERE "role" = 'agent' AND "custom_role_id" IS NULL;