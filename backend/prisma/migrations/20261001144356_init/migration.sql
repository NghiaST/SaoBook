-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'author', 'admin');

-- CreateEnum
CREATE TYPE "RvApiKeyStatus" AS ENUM ('personal', 'public', 'hidden');

-- CreateEnum
CREATE TYPE "RvVoiceName" AS ENUM ('Vietnamese Female', 'Vietnamese Male', 'US English Female', 'US English Male');

-- CreateEnum
CREATE TYPE "RvLanguage" AS ENUM ('vi-VN', 'en-US');

-- CreateEnum
CREATE TYPE "RvGender" AS ENUM ('f', 'm');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "userId" TEXT NOT NULL,
    "ttsSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "autoNextChapter" BOOLEAN NOT NULL DEFAULT false,
    "selectedRvApiKeyId" TEXT,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "rv_settings" (
    "userSettingsId" TEXT NOT NULL,
    "voiceName" "RvVoiceName" NOT NULL DEFAULT 'Vietnamese Female',
    "language" "RvLanguage" NOT NULL DEFAULT 'vi-VN',
    "gender" "RvGender" NOT NULL DEFAULT 'f',
    "pitch" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "rv_settings_pkey" PRIMARY KEY ("userSettingsId")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" SERIAL NOT NULL,
    "nameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "posterUrl" TEXT,
    "description" TEXT,
    "sourceNote" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "storyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" INTEGER NOT NULL,
    "chapterId" INTEGER,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookshelves" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" INTEGER NOT NULL,
    "note" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookshelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" INTEGER NOT NULL,
    "lastChapterId" INTEGER NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_read_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "storyId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_read_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_api_keys" (
    "id" TEXT NOT NULL,
    "userSettingsId" TEXT,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "secret" TEXT,
    "status" "RvApiKeyStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rv_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "stories_nameId_key" ON "stories"("nameId");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_storyId_order_key" ON "chapters"("storyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_storyId_key" ON "reviews"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "bookshelves_userId_storyId_key" ON "bookshelves"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "reading_histories_userId_storyId_key" ON "reading_histories"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_read_logs_userId_chapterId_key" ON "chapter_read_logs"("userId", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "rv_api_keys_key_key" ON "rv_api_keys"("key");

-- AddForeignKey
ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_selectedRvApiKeyId_fkey"
FOREIGN KEY ("selectedRvApiKeyId") REFERENCES "rv_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_settings"
ADD CONSTRAINT "rv_settings_userSettingsId_fkey"
FOREIGN KEY ("userSettingsId") REFERENCES "user_settings"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets"
ADD CONSTRAINT "password_resets_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories"
ADD CONSTRAINT "stories_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters"
ADD CONSTRAINT "chapters_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments"
ADD CONSTRAINT "comments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments"
ADD CONSTRAINT "comments_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments"
ADD CONSTRAINT "comments_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments"
ADD CONSTRAINT "comments_parentCommentId_fkey"
FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookshelves"
ADD CONSTRAINT "bookshelves_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookshelves"
ADD CONSTRAINT "bookshelves_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_histories"
ADD CONSTRAINT "reading_histories_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_histories"
ADD CONSTRAINT "reading_histories_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_histories"
ADD CONSTRAINT "reading_histories_lastChapterId_fkey"
FOREIGN KEY ("lastChapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_read_logs"
ADD CONSTRAINT "chapter_read_logs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_read_logs"
ADD CONSTRAINT "chapter_read_logs_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_read_logs"
ADD CONSTRAINT "chapter_read_logs_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_api_keys"
ADD CONSTRAINT "rv_api_keys_userSettingsId_fkey"
FOREIGN KEY ("userSettingsId") REFERENCES "user_settings"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
