ALTER TYPE "activity_type" RENAME TO "activity_type_old";

CREATE TYPE "activity_type" AS ENUM (
  'lead_created',
  'lead_updated',
  'lead_deleted',
  'status_changed',
  'note_added',
  'lead_viewed',
  'lead_restored'
);

ALTER TABLE "activities"
ALTER COLUMN "type" TYPE "activity_type"
USING (
  CASE "type"::text
    WHEN 'created' THEN 'lead_created'
    WHEN 'updated' THEN 'lead_updated'
    WHEN 'deleted' THEN 'lead_deleted'
    WHEN 'status_changed' THEN 'status_changed'
    ELSE 'lead_updated'
  END
)::"activity_type";

DROP TYPE "activity_type_old";

ALTER TABLE "activities" ADD COLUMN "title" VARCHAR(150);
ALTER TABLE "activities" ADD COLUMN "description" TEXT;

UPDATE "activities"
SET
  "title" = CASE "type"::text
    WHEN 'lead_created' THEN 'Lead Created'
    WHEN 'lead_updated' THEN 'Lead Updated'
    WHEN 'lead_deleted' THEN 'Lead Deleted'
    WHEN 'status_changed' THEN 'Status Changed'
    WHEN 'note_added' THEN 'Note Added'
    WHEN 'lead_viewed' THEN 'Lead Viewed'
    WHEN 'lead_restored' THEN 'Lead Restored'
    ELSE 'Activity'
  END,
  "description" = CASE "type"::text
    WHEN 'lead_created' THEN 'A user created this lead.'
    WHEN 'lead_updated' THEN 'A user updated lead information.'
    WHEN 'lead_deleted' THEN 'A user deleted this lead.'
    WHEN 'status_changed' THEN 'A user changed lead status.'
    WHEN 'note_added' THEN 'A user added a note.'
    WHEN 'lead_viewed' THEN 'A user viewed this lead.'
    WHEN 'lead_restored' THEN 'A user restored this lead.'
    ELSE 'A lead activity was recorded.'
  END
WHERE "title" IS NULL OR "description" IS NULL;

ALTER TABLE "activities" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "activities" ALTER COLUMN "description" SET NOT NULL;

CREATE INDEX "activities_lead_id_created_at_idx" ON "activities"("lead_id", "created_at");