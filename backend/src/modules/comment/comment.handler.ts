// src/modules/comment/comment.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

function parseOptionalChapterId(raw?: string | number): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const id = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Invalid chapter id')
  }
  return id
}

function parseStoryId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Invalid story id')
  }
  return id
}

export async function listComments(
  request: FastifyRequest<{ Params: { storyId: string }; Querystring: { chapterId?: string } }>,
  reply: FastifyReply,
) {
  const storyId = parseStoryId(request.params.storyId)
  const { chapterId } = request.query
  const parsedChapterId = parseOptionalChapterId(chapterId)

  const comments = await prisma.comment.findMany({
    where: {
      storyId,
      chapterId: parsedChapterId,
      parentCommentId: null, // top-level only; replies nested below
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
      replies: {
        include: {
          user: { select: { id: true, username: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return reply.send(comments)
}

export async function createComment(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId } = request.user as AuthUser
  const storyId = parseStoryId(request.params.storyId)
  const { content, chapterId, parentCommentId } = request.body as {
    content: string; chapterId?: string | number; parentCommentId?: string
  }
  const trimmedContent = content?.trim()
  if (!trimmedContent) throw new ValidationError('Comment content is required')

  const parsedChapterId = parseOptionalChapterId(chapterId)
  const normalizedParentId = parentCommentId?.trim() || null

  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')

  if (parsedChapterId !== null) {
    const chapter = await prisma.chapter.findFirst({
      where: { id: parsedChapterId, storyId },
      select: { id: true },
    })
    if (!chapter) throw new NotFoundError('Chapter')
  }

  if (normalizedParentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: normalizedParentId },
      select: { storyId: true, chapterId: true },
    })
    if (!parent) throw new NotFoundError('Parent comment')
    if (parent.storyId !== storyId || parent.chapterId !== parsedChapterId) {
      throw new ValidationError('Parent comment must belong to the same story and chapter')
    }
  }

  const comment = await prisma.comment.create({
    data: {
      userId,
      storyId,
      content: trimmedContent,
      chapterId: parsedChapterId,
      parentCommentId: normalizedParentId,
    },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  })

  return reply.code(201).send(comment)
}

export async function deleteComment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const comment = await prisma.comment.findUnique({ where: { id: request.params.id } })
  if (!comment) throw new NotFoundError('Comment')
  if (comment.userId !== userId && role !== 'admin') throw new ForbiddenError()

  await prisma.comment.delete({ where: { id: comment.id } })
  return reply.code(204).send()
}
