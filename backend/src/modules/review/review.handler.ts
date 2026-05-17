// src/modules/review/review.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

export async function listReviews(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const reviews = await prisma.review.findMany({
    where: { storyId: request.params.storyId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  })
  return reply.send(reviews)
}

export async function upsertReview(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId } = request.user as AuthUser
  const { storyId } = request.params
  const { rating, content } = request.body as { rating: number; content?: string }

  if (rating < 1 || rating > 5) throw new ValidationError('Rating must be between 1 and 5')

  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')

  const review = await prisma.review.upsert({
    where: { userId_storyId: { userId, storyId } },
    create: { userId, storyId, rating, content },
    update: { rating, content },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  })

  return reply.send(review)
}

export async function deleteReview(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const { storyId } = request.params

  const review = await prisma.review.findUnique({
    where: { userId_storyId: { userId, storyId } },
  })
  if (!review) throw new NotFoundError('Review')
  if (review.userId !== userId && role !== 'admin') throw new ForbiddenError()

  await prisma.review.delete({ where: { userId_storyId: { userId, storyId } } })
  return reply.code(204).send()
}
