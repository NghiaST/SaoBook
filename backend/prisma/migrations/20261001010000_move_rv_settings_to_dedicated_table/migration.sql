CREATE TABLE "rv_settings" (
    "userSettingsId" TEXT NOT NULL,
    "voiceName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "pitch" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "rv_settings_pkey" PRIMARY KEY ("userSettingsId")
);

INSERT INTO "rv_settings" ("userSettingsId", "voiceName", "language", "gender")
SELECT
    "userId",
    CASE
        WHEN "ttsLanguage" = 'vi' AND "ttsVoice" = 'male' THEN 'Vietnamese Male'
        WHEN "ttsLanguage" = 'vi' THEN 'Vietnamese Female'
        WHEN "ttsLanguage" = 'zh' AND "ttsVoice" = 'male' THEN 'Chinese Male'
        WHEN "ttsLanguage" = 'zh' THEN 'Chinese Female'
        WHEN "ttsVoice" = 'male' THEN 'US English Male'
        ELSE 'US English Female'
    END,
    CASE
        WHEN "ttsLanguage" = 'vi' THEN 'vi'
        WHEN "ttsLanguage" = 'zh' THEN 'zh-CN'
        ELSE 'en-US'
    END,
    CASE WHEN "ttsVoice" = 'male' THEN 'male' ELSE 'female' END
FROM "user_settings";

ALTER TABLE "rv_api_keys"
DROP CONSTRAINT "rv_api_keys_userSettingsId_fkey";

UPDATE "rv_api_keys" AS keys
SET "userSettingsId" = settings."userId"
FROM "user_settings" AS settings
WHERE keys."userSettingsId" = settings."id";

ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_pkey";
ALTER TABLE "user_settings" DROP COLUMN "id";
ALTER TABLE "user_settings" DROP COLUMN "ttsLanguage";
ALTER TABLE "user_settings" DROP COLUMN "ttsVoice";
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId");
DROP INDEX "user_settings_userId_key";

ALTER TABLE "rv_settings"
ADD CONSTRAINT "rv_settings_userSettingsId_fkey"
FOREIGN KEY ("userSettingsId") REFERENCES "user_settings"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rv_api_keys"
ADD CONSTRAINT "rv_api_keys_userSettingsId_fkey"
FOREIGN KEY ("userSettingsId") REFERENCES "user_settings"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TYPE "TTSLanguage";
