// src/modules/story/story.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../common/exceptions'
import { deleteFile, uploadPoster } from '../../storage/r2'

type AuthUser = { id: string; role: string }

// ── List / Search ─────────────────────────────────────────────────────────────

export async function listStories(request: FastifyRequest, reply: FastifyReply) {
  const {
    q, page = '1', limit = '20', sort = 'newest',
  } = request.query as Record<string, string>

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const take = parseInt(limit)

  const orderBy =
    sort === 'rating' ? { reviews: { _count: 'desc' as const } }
    : sort === 'popular' ? { chapterReadLogs: { _count: 'desc' as const } }
    : { createdAt: 'desc' as const }

  const where = q
    ? { name: { contains: q, mode: 'insensitive' as const } }
    : {}

  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true, nameId: true, name: true, posterUrl: true,
        description: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, username: true, name: true } },
        _count: { select: { chapters: true, reviews: true } },
      },
    }),
    prisma.story.count({ where }),
  ])

  return reply.send({ stories, total, page: parseInt(page), limit: take })
}

export async function getStory(
  request: FastifyRequest<{ Params: { nameId: string } }>,
  reply: FastifyReply,
) {
  const story = await prisma.story.findUnique({
    where: { nameId: request.params.nameId },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true } },
      _count: { select: { chapters: true, reviews: true } },
      reviews: {
        select: { rating: true },
      },
    },
  })

  if (!story) throw new NotFoundError('Story')

  const avgRating =
    story.reviews.length > 0
      ? story.reviews.reduce((s, r) => s + r.rating, 0) / story.reviews.length
      : null

  return reply.send({ ...story, avgRating })
}

export async function listChapters(
  request: FastifyRequest<{ Params: { nameId: string } }>,
  reply: FastifyReply,
) {
  const story = await prisma.story.findUnique({ where: { nameId: request.params.nameId } })
  if (!story) throw new NotFoundError('Story')

  const chapters = await prisma.chapter.findMany({
    where: { storyId: story.id },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, order: true, createdAt: true },
  })

  return reply.send(chapters)
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createStory(request: FastifyRequest, reply: FastifyReply) {
  const { id: authorId } = request.user as AuthUser
  const body = request.body as {
    nameId: string; name: string; description?: string
    posterUrl?: string; sourceNote?: string
  }

  const existing = await prisma.story.findUnique({ where: { nameId: body.nameId } })
  if (existing) throw new ConflictError('Story slug already exists')

  const story = await prisma.story.create({
    data: { ...body, authorId },
  })

  return reply.code(201).send(story)
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateStory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const story = await prisma.story.findUnique({ where: { id: request.params.id } })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  const body = request.body as Record<string, unknown>
  const updated = await prisma.story.update({
    where: { id: story.id },
    data: body,
  })

  return reply.send(updated)
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteStory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const story = await prisma.story.findUnique({
    where: { id: request.params.id },
    include: { chapters: true },
  })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  // Delete chapter files from R2
  await Promise.allSettled(
    story.chapters.map((c) => deleteFile(c.contentUrl))
  )
  if (story.posterUrl) await deleteFile(story.posterUrl).catch(() => null)

  // Cascade delete via Prisma (all related records)
  await prisma.story.delete({ where: { id: story.id } })

  return reply.code(204).send()
}

// ── Upload poster ────────────────────────────────────────────────────────────

export async function uploadStoryPoster(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const story = await prisma.story.findUnique({ where: { id: request.params.id } })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  const file = await request.file()
  if (!file) throw new ValidationError('Poster file is required')
  if (!file.mimetype.startsWith('image/')) throw new ValidationError('Poster must be an image')

  const buffer = await file.toBuffer()
  const posterUrl = await uploadPoster(buffer, file.mimetype, story.id)

  if (story.posterUrl && story.posterUrl !== posterUrl) {
    await deleteFile(story.posterUrl).catch(() => null)
  }

  await prisma.story.update({
    where: { id: story.id },
    data: { posterUrl },
  })

  return reply.send({ posterUrl })
}

// ── Upload poster from URL ───────────────────────────────────────────────────

export async function uploadStoryPosterFromUrl(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const story = await prisma.story.findUnique({ where: { id: request.params.id } })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  const { url } = request.body as { url?: string }
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new ValidationError('Valid image URL is required')
  }

  const response = await fetch(url)
  if (!response.ok) throw new ValidationError('Unable to fetch image from URL')

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) throw new ValidationError('URL must point to an image')

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length > 10 * 1024 * 1024) {
    throw new ValidationError('Image must be 10MB or smaller')
  }

  const posterUrl = await uploadPoster(buffer, contentType, story.id)

  if (story.posterUrl && story.posterUrl !== posterUrl) {
    await deleteFile(story.posterUrl).catch(() => null)
  }

  await prisma.story.update({
    where: { id: story.id },
    data: { posterUrl },
  })

  return reply.send({ posterUrl })
}

// ── My Stories ────────────────────────────────────────────────────────────────

export async function getMyStories(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const stories = await prisma.story.findMany({
    where: { authorId: id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { chapters: true, reviews: true, chapterReadLogs: true } },
    },
  })
  return reply.send(stories)
}
