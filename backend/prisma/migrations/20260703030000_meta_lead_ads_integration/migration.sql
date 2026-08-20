ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'lead_created_via_meta';

CREATE TABLE "facebook_connections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "page_id" VARCHAR(80) NOT NULL,
  "page_name" VARCHAR(255) NOT NULL,
  "form_id" VARCHAR(80) NOT NULL,
  "form_name" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "token_expires_at" TIMESTAMPTZ(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "facebook_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facebook_connections_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "facebook_connections_page_id_idx" ON "facebook_connections"("page_id");
CREATE INDEX "facebook_connections_form_id_idx" ON "facebook_connections"("form_id");
CREATE INDEX "facebook_connections_page_id_form_id_idx" ON "facebook_connections"("page_id", "form_id");
CREATE INDEX "facebook_connections_is_active_idx" ON "facebook_connections"("is_active");
CREATE INDEX "facebook_connections_created_by_idx" ON "facebook_connections"("created_by");
