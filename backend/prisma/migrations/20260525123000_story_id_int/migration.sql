-- Switch Story IDs from UUID (text) to autoincrement integer

CREATE SEQUENCE IF NOT EXISTS "stories_id_seq";

ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "id_int" INTEGER;

UPDATE "stories"
SET "id_int" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "stories"
) AS sub
WHERE "stories".id = sub.id;

ALTER TABLE "stories"
  ALTER COLUMN "id_int" SET DEFAULT nextval('stories_id_seq');

SELECT setval('stories_id_seq', (SELECT COALESCE(MAX("id_int"), 0) FROM "stories"));

ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "storyId_int" INTEGER;
UPDATE "chapters"
SET "storyId_int" = s.id_int
FROM "stories" s
WHERE "chapters"."storyId" = s.id;

ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "storyId_int" INTEGER;
UPDATE "comments"
SET "storyId_int" = s.id_int
FROM "stories" s
WHERE "comments"."storyId" = s.id;

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "storyId_int" INTEGER;
UPDATE "reviews"
SET "storyId_int" = s.id_int
FROM "stories" s
WHERE "reviews"."storyId" = s.id;

ALTER TABLE "bookshelves" ADD COLUMN IF NOT EXISTS "storyId_int" INTEGER;
UPDATE "bookshelves"
SET "storyId_int" = s.id_int
FROM "stories" s
WHERE "bookshelves"."storyId" = s.id;

ALTER TABLE "reading_histories" ADD COLUMN IF NOT EXISTS "storyId_int" INTEGER;
UPDATE "reading_histories"
SET "storyId_int" = s.id_int
FROM "stories" s
WHERE "reading_histories"."storyId" = s.id;

ALTER TABLE "chapter_read_logs" ADD COLUMN IF NOT EXISTS "storyId_int" INTEGER;
UPDATE "chapter_read_logs"
SET "storyId_int" = s.id_int
FROM "stories" s
WHERE "chapter_read_logs"."storyId" = s.id;

ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_storyId_fkey";
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_storyId_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_storyId_fkey";
ALTER TABLE "bookshelves" DROP CONSTRAINT IF EXISTS "bookshelves_storyId_fkey";
ALTER TABLE "reading_histories" DROP CONSTRAINT IF EXISTS "reading_histories_storyId_fkey";
ALTER TABLE "chapter_read_logs" DROP CONSTRAINT IF EXISTS "chapter_read_logs_storyId_fkey";

DROP INDEX IF EXISTS "chapters_storyId_order_key";
DROP INDEX IF EXISTS "reviews_userId_storyId_key";
DROP INDEX IF EXISTS "bookshelves_userId_storyId_key";
DROP INDEX IF EXISTS "reading_histories_userId_storyId_key";

ALTER TABLE "chapters" DROP COLUMN "storyId";
ALTER TABLE "chapters" RENAME COLUMN "storyId_int" TO "storyId";
ALTER TABLE "chapters" ALTER COLUMN "storyId" SET NOT NULL;

ALTER TABLE "comments" DROP COLUMN "storyId";
ALTER TABLE "comments" RENAME COLUMN "storyId_int" TO "storyId";
ALTER TABLE "comments" ALTER COLUMN "storyId" SET NOT NULL;

ALTER TABLE "reviews" DROP COLUMN "storyId";
ALTER TABLE "reviews" RENAME COLUMN "storyId_int" TO "storyId";
ALTER TABLE "reviews" ALTER COLUMN "storyId" SET NOT NULL;

ALTER TABLE "bookshelves" DROP COLUMN "storyId";
ALTER TABLE "bookshelves" RENAME COLUMN "storyId_int" TO "storyId";
ALTER TABLE "bookshelves" ALTER COLUMN "storyId" SET NOT NULL;

ALTER TABLE "reading_histories" DROP COLUMN "storyId";
ALTER TABLE "reading_histories" RENAME COLUMN "storyId_int" TO "storyId";
ALTER TABLE "reading_histories" ALTER COLUMN "storyId" SET NOT NULL;

ALTER TABLE "chapter_read_logs" DROP COLUMN "storyId";
ALTER TABLE "chapter_read_logs" RENAME COLUMN "storyId_int" TO "storyId";
ALTER TABLE "chapter_read_logs" ALTER COLUMN "storyId" SET NOT NULL;

ALTER TABLE "stories" DROP CONSTRAINT IF EXISTS "stories_pkey";
ALTER TABLE "stories" DROP COLUMN "id";
ALTER TABLE "stories" RENAME COLUMN "id_int" TO "id";
ALTER TABLE "stories" ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");

ALTER TABLE "chapters"
  ADD CONSTRAINT "chapters_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE;

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE;

ALTER TABLE "bookshelves"
  ADD CONSTRAINT "bookshelves_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE;

ALTER TABLE "reading_histories"
  ADD CONSTRAINT "reading_histories_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE;

ALTER TABLE "chapter_read_logs"
  ADD CONSTRAINT "chapter_read_logs_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "chapters_storyId_order_key" ON "chapters"("storyId", "order");
CREATE UNIQUE INDEX "reviews_userId_storyId_key" ON "reviews"("userId", "storyId");
CREATE UNIQUE INDEX "bookshelves_userId_storyId_key" ON "bookshelves"("userId", "storyId");
CREATE UNIQUE INDEX "reading_histories_userId_storyId_key" ON "reading_histories"("userId", "storyId");
