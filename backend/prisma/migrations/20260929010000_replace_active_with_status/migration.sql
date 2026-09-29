CREATE TYPE "RvApiKeyStatus" AS ENUM ('personal', 'public', 'hidden');

ALTER TABLE "rv_api_keys" ADD COLUMN "status" "RvApiKeyStatus";

UPDATE "rv_api_keys"
SET "status" = CASE
  WHEN "active" = false THEN 'hidden'::"RvApiKeyStatus"
  WHEN "userId" IS NULL THEN 'public'::"RvApiKeyStatus"
  ELSE 'personal'::"RvApiKeyStatus"
END;

ALTER TABLE "rv_api_keys"
  ALTER COLUMN "status" SET NOT NULL,
  DROP COLUMN "active";
