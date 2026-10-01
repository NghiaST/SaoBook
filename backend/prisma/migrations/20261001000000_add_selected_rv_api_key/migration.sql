ALTER TABLE "user_settings" ADD COLUMN "selectedRvApiKeyId" TEXT;

ALTER TABLE "rv_api_keys" ADD COLUMN "secret" TEXT;

ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_selectedRvApiKeyId_fkey"
FOREIGN KEY ("selectedRvApiKeyId") REFERENCES "rv_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "user_settings_selectedRvApiKeyId_idx" ON "user_settings"("selectedRvApiKeyId");