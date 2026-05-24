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

export async function listComments(
  request: FastifyRequest<{ Params: { storyId: string }; Querystring: { chapterId?: string } }>,
  reply: FastifyReply,
) {
  const { storyId } = request.params
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
  const { storyId } = request.params
  const { content, chapterId, parentCommentId } = request.body as {
    content: string; chapterId?: string | number; parentCommentId?: string
  }
  const parsedChapterId = parseOptionalChapterId(chapterId)

  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')

  const comment = await prisma.comment.create({
    data: { userId, storyId, content, chapterId: parsedChapterId, parentCommentId },
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
