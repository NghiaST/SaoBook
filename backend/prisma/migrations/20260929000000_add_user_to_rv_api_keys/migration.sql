ALTER TABLE "rv_api_keys" ADD COLUMN "userId" TEXT;

ALTER TABLE "rv_api_keys"
ADD CONSTRAINT "rv_api_keys_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "rv_api_keys_userId_idx" ON "rv_api_keys"("userId");