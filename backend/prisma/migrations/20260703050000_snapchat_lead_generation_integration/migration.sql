ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_created_via_snapchat';

CREATE TABLE "snapchat_connections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" VARCHAR(80),
  "ad_account_id" VARCHAR(80) NOT NULL,
  "ad_account_name" VARCHAR(255) NOT NULL,
  "form_id" VARCHAR(80) NOT NULL,
  "form_name" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "token_expires_at" TIMESTAMPTZ(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "snapchat_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "snapchat_connections_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "snapchat_connections_organization_id_idx" ON "snapchat_connections"("organization_id");
CREATE INDEX "snapchat_connections_ad_account_id_idx" ON "snapchat_connections"("ad_account_id");
CREATE INDEX "snapchat_connections_form_id_idx" ON "snapchat_connections"("form_id");
CREATE INDEX "snapchat_connections_ad_account_id_form_id_idx" ON "snapchat_connections"("ad_account_id", "form_id");
CREATE INDEX "snapchat_connections_is_active_idx" ON "snapchat_connections"("is_active");
CREATE INDEX "snapchat_connections_created_by_idx" ON "snapchat_connections"("created_by");
