CREATE INDEX "leads_source_channel_idx" ON "leads"("source_channel");
CREATE INDEX "leads_deleted_at_created_at_idx" ON "leads"("deleted_at", "created_at");
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");
CREATE INDEX "leads_treatment_id_created_at_idx" ON "leads"("treatment_id", "created_at");
CREATE INDEX "leads_source_channel_created_at_idx" ON "leads"("source_channel", "created_at");