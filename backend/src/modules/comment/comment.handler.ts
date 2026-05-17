// src/modules/comment/comment.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError, ForbiddenError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

export async function listComments(
  request: FastifyRequest<{ Params: { storyId: string }; Querystring: { chapterId?: string } }>,
  reply: FastifyReply,
) {
  const { storyId } = request.params
  const { chapterId } = request.query

  const comments = await prisma.comment.findMany({
    where: {
      storyId,
      chapterId: chapterId ?? null,
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
    content: string; chapterId?: string; parentCommentId?: string
  }

  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')

  const comment = await prisma.comment.create({
    data: { userId, storyId, content, chapterId, parentCommentId },
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
