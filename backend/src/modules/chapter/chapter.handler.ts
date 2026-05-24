// src/modules/chapter/chapter.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { uploadChapterContent, deleteFile } from '../../storage/r2'
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

function parseChapterId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Invalid chapter id')
  }
  return id
}

// ── Get chapter (public) ──────────────────────────────────────────────────────

export async function getChapter(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const chapterId = parseChapterId(request.params.id)
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      story: { select: { id: true, name: true, nameId: true } },
    },
  })
  if (!chapter) throw new NotFoundError('Chapter')

  return reply.send(chapter)
}

// ── Create single chapter ─────────────────────────────────────────────────────

export async function createChapter(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const story = await assertStoryOwner(request.params.storyId, userId, role)

  const { name, content, order } = request.body as {
    name: string; content: string; order?: number
  }

  // Auto-assign order if not provided
  const chapterOrder = order ?? (await nextOrder(story.id))

  const chapter = await prisma.chapter.create({ data: { name, order: chapterOrder, contentUrl: '', storyId: story.id } })
  const contentUrl = await uploadChapterContent(content, story.id, chapter.id)
  const updated = await prisma.chapter.update({ where: { id: chapter.id }, data: { contentUrl } })

  return reply.code(201).send(updated)
}

// ── Batch create chapters ─────────────────────────────────────────────────────

export async function createChaptersBatch(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const story = await assertStoryOwner(request.params.storyId, userId, role)

  const chapters = request.body as Array<{ name: string; content: string; order?: number }>
  let currentOrder = await nextOrder(story.id)

  const created = await Promise.all(
    chapters.map(async ({ name, content, order }) => {
      const chapterOrder = order ?? currentOrder++
      const chapter = await prisma.chapter.create({
        data: { name, order: chapterOrder, contentUrl: '', storyId: story.id },
      })
      const contentUrl = await uploadChapterContent(content, story.id, chapter.id)
      return prisma.chapter.update({ where: { id: chapter.id }, data: { contentUrl } })
    }),
  )

  return reply.code(201).send(created)
}

// ── Update chapter ────────────────────────────────────────────────────────────

export async function updateChapter(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const chapterId = parseChapterId(request.params.id)
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { story: true },
  })
  if (!chapter) throw new NotFoundError('Chapter')
  if (chapter.story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  const { name, content, order } = request.body as {
    name?: string; content?: string; order?: number
  }

  let contentUrl = chapter.contentUrl
  if (content) {
    await deleteFile(contentUrl).catch(() => null)
    contentUrl = await uploadChapterContent(content, chapter.storyId, chapter.id)
  }

  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: {
      ...(name && { name }),
      ...(order !== undefined && { order }),
      contentUrl,
    },
  })

  return reply.send(updated)
}

// ── Delete chapter ────────────────────────────────────────────────────────────

export async function deleteChapter(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const chapterId = parseChapterId(request.params.id)
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { story: true },
  })
  if (!chapter) throw new NotFoundError('Chapter')
  if (chapter.story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  await deleteFile(chapter.contentUrl).catch(() => null)
  await prisma.chapter.delete({ where: { id: chapter.id } })

  return reply.code(204).send()
}

// ── Mark chapter as read ──────────────────────────────────────────────────────

export async function markChapterRead(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId } = request.user as AuthUser
  const chapterId = parseChapterId(request.params.id)
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
  if (!chapter) throw new NotFoundError('Chapter')

  await Promise.all([
    // Upsert last-read history
    prisma.readingHistory.upsert({
      where: { userId_storyId: { userId, storyId: chapter.storyId } },
      create: { userId, storyId: chapter.storyId, lastChapterId: chapter.id },
      update: { lastChapterId: chapter.id },
    }),
    // Log individual chapter read (idempotent)
    prisma.chapterReadLog.upsert({
      where: { userId_chapterId: { userId, chapterId: chapter.id } },
      create: { userId, chapterId: chapter.id, storyId: chapter.storyId },
      update: { readAt: new Date() },
    }),
  ])

  return reply.send({ ok: true })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertStoryOwner(storyId: string, userId: string, role: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()
  return story
}

async function nextOrder(storyId: string): Promise<number> {
  const last = await prisma.chapter.findFirst({
    where: { storyId },
    orderBy: { order: 'desc' },
  })
  return (last?.order ?? 0) + 1
}
