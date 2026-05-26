// src/modules/story/story.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { uploadPoster, deleteFile } from '../../storage/r2'
import {
  NotFoundError, ForbiddenError, ConflictError, ValidationError,
} from '../../common/exceptions'

type AuthUser = { id: string; role: string }

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_BYTES = 10 * 1024 * 1024

function parseStoryId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Invalid story id')
  }
  return id
}

// ── Helper: extract text fields + optional poster file from multipart body ────

interface StoryFields {
  name?: string
  nameId?: string
  description?: string
  sourceNote?: string
  posterUrl?: string
  posterBuffer?: Buffer
  posterMime?: string
}

function extractFields(body: Record<string, any>): StoryFields {
  const str = (v: any) =>
    typeof v === 'object' && v !== null && 'value' in v ? String(v.value) : String(v ?? '')

  const result: StoryFields = {
    name:        str(body.name)        || undefined,
    nameId:      str(body.nameId)      || undefined,
    description: str(body.description) || undefined,
    sourceNote:  str(body.sourceNote)  || undefined,
    posterUrl:   str(body.posterUrl)   || undefined,
  }

  // poster field — present when attachFieldsToBody: true (multipart)
  const poster = body.poster
  if (poster && typeof poster === 'object' && 'mimetype' in poster) {
    result.posterMime = poster.mimetype
    // toBuffer() is available when attachFieldsToBody: true
    result.posterBuffer = poster._buf ?? poster.data ?? undefined
  }

  return result
}

async function resolveBuffer(poster: any): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!poster) return null

  const { buffer, mimeType } = await bufferFromMultipart(poster)
  if (!mimeType) return null
  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new ValidationError('Poster must be a supported image type')
  }
  if (buffer.length === 0) return null
  if (buffer.length > MAX_BYTES) throw new ValidationError('Poster must be 10 MB or smaller')

  return { buffer, mime: mimeType }
}

// ── List / Search ─────────────────────────────────────────────────────────────

export async function listStories(request: FastifyRequest, reply: FastifyReply) {
  const { q, page = '1', limit = '20', sort = 'newest' } = request.query as Record<string, string>

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const take = parseInt(limit)

  const orderBy =
    sort === 'rating'  ? { reviews:        { _count: 'desc' as const } } :
    sort === 'popular' ? { chapterReadLogs: { _count: 'desc' as const } } :
                         { createdAt:        'desc'  as const }

  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {}

  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where, skip, take, orderBy,
      select: {
        id: true, nameId: true, name: true, posterUrl: true,
        description: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, username: true, name: true } },
        _count:  { select: { chapters: true, reviews: true } },
      },
    }),
    prisma.story.count({ where }),
  ])

  return reply.send({ stories, total, page: parseInt(page), limit: take })
}

// ── Get one ───────────────────────────────────────────────────────────────────

export async function getStory(
  request: FastifyRequest<{ Params: { nameId: string } }>,
  reply: FastifyReply,
) {
  const story = await prisma.story.findUnique({
    where: { nameId: request.params.nameId },
    include: {
      author:  { select: { id: true, username: true, name: true, avatarUrl: true } },
      _count:  { select: { chapters: true, reviews: true } },
      reviews: { select: { rating: true } },
    },
  })
  if (!story) throw new NotFoundError('Story')

  const avgRating = story.reviews.length
    ? story.reviews.reduce((s, r) => s + r.rating, 0) / story.reviews.length
    : null

  return reply.send({ ...story, avgRating })
}

// ── List chapters ─────────────────────────────────────────────────────────────

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

// ── Create (multipart) ────────────────────────────────────────────────────────

export async function createStory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id: authorId } = request.user as AuthUser

  const body = request.body as Record<string, any>
  const { name, nameId, description, sourceNote } = extractFields(body)

  if (!name || !nameId) {
    throw new ValidationError('name and nameId are required')
  }

  const posterResult = await resolveBuffer(pickFile(body))
  if (!posterResult) {
    throw new ValidationError('Poster file is required')
  }

  const existing = await prisma.story.findUnique({
    where: { nameId },
  })

  if (existing) {
    throw new ConflictError('Story slug already exists')
  }

  const { buffer, mime } = posterResult

  // Tạo story trước để lấy ID
  let story = await prisma.story.create({
    data: {
      name,
      nameId,
      description,
      sourceNote,
      authorId,
    },
  })

  // Upload lên R2
  const posterUrl = await uploadPoster(
    buffer,
    mime,
    story.id,
  )

  // Cập nhật posterUrl
  story = await prisma.story.update({
    where: { id: story.id },
    data: { posterUrl },
  })

  return reply.code(201).send(story)
}

// ── Update (multipart) ────────────────────────────────────────────────────────

export async function updateStory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const storyId = parseStoryId(request.params.id)
  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  const body = request.body as Record<string, any>
  const { name, description, sourceNote, posterUrl: posterSourceUrl } = extractFields(body)

  // Upload new poster if provided, delete old one
  let posterUrl = story.posterUrl ?? undefined
  const posterResult = await resolveBuffer(pickFile(body))
  if (posterResult) {
    posterUrl = await uploadPoster(posterResult.buffer, posterResult.mime, story.id)
    if (story.posterUrl && story.posterUrl !== posterUrl) {
      await deleteFile(story.posterUrl).catch(() => null)
    }
  } else if (posterSourceUrl) {
    const response = await fetch(posterSourceUrl)
    if (!response.ok) throw new ValidationError('Unable to fetch image from URL')

    const contentType = response.headers.get('content-type') ?? ''
    if (!ALLOWED_MIME.includes(contentType)) {
      throw new ValidationError('URL must point to a supported image type')
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.length > MAX_BYTES) throw new ValidationError('Poster must be 10 MB or smaller')

    posterUrl = await uploadPoster(buffer, contentType, story.id)
    if (story.posterUrl && story.posterUrl !== posterUrl) {
      await deleteFile(story.posterUrl).catch(() => null)
    }
  }

  const updated = await prisma.story.update({
    where: { id: story.id },
    data: {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sourceNote  !== undefined && { sourceNote }),
      ...(posterUrl   !== undefined && { posterUrl }),
    },
  })

  return reply.send(updated)
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteStory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const storyId = parseStoryId(request.params.id)
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { chapters: true },
  })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  await Promise.allSettled(story.chapters.map((c) => deleteFile(c.contentUrl)))
  if (story.posterUrl) await deleteFile(story.posterUrl).catch(() => null)

  await prisma.story.delete({ where: { id: story.id } })
  return reply.code(204).send()
}

// ── Upload poster (separate endpoint) ───────────────────────────────────────

export async function uploadStoryPoster(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const storyId = parseStoryId(request.params.id)
  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  const body = request.body as Record<string, any>
  const posterResult = await resolveBuffer(pickFile(body))
  if (!posterResult) throw new ValidationError('Poster file is required')

  const posterUrl = await uploadPoster(posterResult.buffer, posterResult.mime, story.id)
  if (story.posterUrl && story.posterUrl !== posterUrl) {
    await deleteFile(story.posterUrl).catch(() => null)
  }

  const updated = await prisma.story.update({
    where: { id: story.id },
    data: { posterUrl },
  })

  return reply.send({ posterUrl: updated.posterUrl })
}

// ── Upload poster from URL (separate endpoint) ──────────────────────────────

export async function uploadStoryPosterFromUrl(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const storyId = parseStoryId(request.params.id)
  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')
  if (story.authorId !== userId && role !== 'admin') throw new ForbiddenError()

  const { url } = request.body as { url?: string }
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new ValidationError('Valid image URL is required')
  }

  const response = await fetch(url)
  if (!response.ok) throw new ValidationError('Unable to fetch image from URL')

  const contentType = response.headers.get('content-type') ?? ''
  if (!ALLOWED_MIME.includes(contentType)) {
    throw new ValidationError('URL must point to a supported image type')
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length > MAX_BYTES) throw new ValidationError('Poster must be 10 MB or smaller')

  const posterUrl = await uploadPoster(buffer, contentType, story.id)
  if (story.posterUrl && story.posterUrl !== posterUrl) {
    await deleteFile(story.posterUrl).catch(() => null)
  }

  const updated = await prisma.story.update({
    where: { id: story.id },
    data: { posterUrl },
  })

  return reply.send({ posterUrl: updated.posterUrl })
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

function pickFile(body: Record<string, any>): any {
  const candidate = body.posterFile ?? body.poster ?? body.file
  if (Array.isArray(candidate)) return candidate[0]
  return candidate
}

async function bufferFromMultipart(file: any): Promise<{ buffer: Buffer; mimeType: string }>
{
  const mimeType = file?.mimetype ?? file?.type ?? file?.headers?.['content-type'] ?? ''

  if (typeof file?.toBuffer === 'function') {
    return { buffer: await file.toBuffer(), mimeType }
  }

  if (file?.file && typeof file.file.on === 'function') {
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      file.file.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      file.file.on('end', resolve)
      file.file.on('error', reject)
    })
    return { buffer: Buffer.concat(chunks), mimeType }
  }

  if (Buffer.isBuffer(file)) {
    return { buffer: file, mimeType }
  }

  throw new ValidationError('Poster file is required')
}