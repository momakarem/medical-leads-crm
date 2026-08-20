ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_created_via_tiktok';

CREATE TABLE "tiktok_connections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "advertiser_id" VARCHAR(80) NOT NULL,
  "advertiser_name" VARCHAR(255) NOT NULL,
  "form_id" VARCHAR(80) NOT NULL,
  "form_name" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "token_expires_at" TIMESTAMPTZ(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tiktok_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tiktok_connections_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "tiktok_connections_advertiser_id_idx" ON "tiktok_connections"("advertiser_id");
CREATE INDEX "tiktok_connections_form_id_idx" ON "tiktok_connections"("form_id");
CREATE INDEX "tiktok_connections_advertiser_id_form_id_idx" ON "tiktok_connections"("advertiser_id", "form_id");
CREATE INDEX "tiktok_connections_is_active_idx" ON "tiktok_connections"("is_active");
CREATE INDEX "tiktok_connections_created_by_idx" ON "tiktok_connections"("created_by");
