-- Switch Chapter IDs from UUID to autoincrement integer

CREATE SEQUENCE IF NOT EXISTS "chapters_id_seq";

ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "id_int" INTEGER;

UPDATE "chapters"
SET "id_int" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "chapters"
) AS sub
WHERE "chapters".id = sub.id;

ALTER TABLE "chapters"
  ALTER COLUMN "id_int" SET DEFAULT nextval('chapters_id_seq');

SELECT setval('chapters_id_seq', (SELECT COALESCE(MAX("id_int"), 0) FROM "chapters"));

ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "chapterId_int" INTEGER;
UPDATE "comments"
SET "chapterId_int" = c.id_int
FROM "chapters" c
WHERE "comments"."chapterId" IS NOT NULL
  AND "comments"."chapterId" = c.id;

ALTER TABLE "reading_histories" ADD COLUMN IF NOT EXISTS "lastChapterId_int" INTEGER;
UPDATE "reading_histories"
SET "lastChapterId_int" = c.id_int
FROM "chapters" c
WHERE "reading_histories"."lastChapterId" = c.id;

ALTER TABLE "chapter_read_logs" ADD COLUMN IF NOT EXISTS "chapterId_int" INTEGER;
UPDATE "chapter_read_logs"
SET "chapterId_int" = c.id_int
FROM "chapters" c
WHERE "chapter_read_logs"."chapterId" = c.id;

ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_chapterId_fkey";
ALTER TABLE "reading_histories" DROP CONSTRAINT IF EXISTS "reading_histories_lastChapterId_fkey";
ALTER TABLE "chapter_read_logs" DROP CONSTRAINT IF EXISTS "chapter_read_logs_chapterId_fkey";
ALTER TABLE "chapter_read_logs" DROP CONSTRAINT IF EXISTS "chapter_read_logs_userId_chapterId_key";

ALTER TABLE "comments" DROP COLUMN "chapterId";
ALTER TABLE "comments" RENAME COLUMN "chapterId_int" TO "chapterId";

ALTER TABLE "reading_histories" DROP COLUMN "lastChapterId";
ALTER TABLE "reading_histories" RENAME COLUMN "lastChapterId_int" TO "lastChapterId";
ALTER TABLE "reading_histories" ALTER COLUMN "lastChapterId" SET NOT NULL;

ALTER TABLE "chapter_read_logs" DROP COLUMN "chapterId";
ALTER TABLE "chapter_read_logs" RENAME COLUMN "chapterId_int" TO "chapterId";
ALTER TABLE "chapter_read_logs" ALTER COLUMN "chapterId" SET NOT NULL;

ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_pkey";
ALTER TABLE "chapters" DROP COLUMN "id";
ALTER TABLE "chapters" RENAME COLUMN "id_int" TO "id";
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL;

ALTER TABLE "reading_histories"
  ADD CONSTRAINT "reading_histories_lastChapterId_fkey"
  FOREIGN KEY ("lastChapterId") REFERENCES "chapters"("id") ON DELETE CASCADE;

ALTER TABLE "chapter_read_logs"
  ADD CONSTRAINT "chapter_read_logs_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE;

ALTER TABLE "chapter_read_logs"
  ADD CONSTRAINT "chapter_read_logs_userId_chapterId_key" UNIQUE ("userId", "chapterId");
