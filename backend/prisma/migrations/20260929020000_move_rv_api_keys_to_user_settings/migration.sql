ALTER TABLE "rv_api_keys" ADD COLUMN "userSettingsId" TEXT;

UPDATE "rv_api_keys" AS keys
SET "userSettingsId" = settings."id"
FROM "user_settings" AS settings
WHERE settings."userId" = keys."userId";

ALTER TABLE "rv_api_keys"
DROP CONSTRAINT "rv_api_keys_userId_fkey";

DROP INDEX "rv_api_keys_userId_idx";

ALTER TABLE "rv_api_keys" DROP COLUMN "userId";

ALTER TABLE "rv_api_keys"
ADD CONSTRAINT "rv_api_keys_userSettingsId_fkey"
FOREIGN KEY ("userSettingsId") REFERENCES "user_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "rv_api_keys_userSettingsId_idx" ON "rv_api_keys"("userSettingsId");

ALTER TABLE "user_settings"
	DROP COLUMN "ttsVolume",
	DROP COLUMN "sleepTimerMinutes",
	DROP COLUMN "theme",
	DROP COLUMN "bgColor",
	DROP COLUMN "textColor",
	DROP COLUMN "fontFamily",
	DROP COLUMN "fontSize",
	DROP COLUMN "lineHeight";

DROP TYPE "UITheme";