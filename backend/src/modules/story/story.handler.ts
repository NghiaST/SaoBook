// src/modules/story/story.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/exceptions'
import { deleteFile } from '../../storage/r2'

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
