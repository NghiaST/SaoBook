// src/modules/admin/admin.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError } from '../../common/exceptions'
import { Role } from '@prisma/client'

export async function listUsers(request: FastifyRequest, reply: FastifyReply) {
  const { q, role, page = '1', limit = '50' } = request.query as Record<string, string>

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const take = parseInt(limit)

  const where = {
    ...(q && {
      OR: [
        { username: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { name: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    ...(role && { role: role as Role }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, email: true, name: true,
        role: true, createdAt: true,
        _count: { select: { stories: true, comments: true, chapterReadLogs: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return reply.send({ users, total, page: parseInt(page), limit: take })
}

export async function listBooks(request: FastifyRequest, reply: FastifyReply) {
  const { q, authorId, page = '1', limit = '20' } = request.query as Record<string, string>
  const currentPage = Math.max(1, parseInt(page, 10) || 1)
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip = (currentPage - 1) * take
  const where = {
    ...(q && { name: { contains: q, mode: 'insensitive' as const } }),
    ...(authorId && { authorId }),
  }

  const [books, total] = await Promise.all([
    prisma.story.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        nameId: true,
        name: true,
        posterUrl: true,
        description: true,
        sourceNote: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true } },
        _count: { select: { chapters: true, reviews: true, comments: true, chapterReadLogs: true } },
      },
    }),
    prisma.story.count({ where }),
  ])

  return reply.send({ books, total, page: currentPage, limit: take })
}

export async function changeRole(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { role } = request.body as { role: Role }
  const user = await prisma.user.findUnique({ where: { id: request.params.id } })
  if (!user) throw new NotFoundError('User')

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role },
    select: { id: true, username: true, email: true, role: true },
  })

  return reply.send(updated)
}

export async function deleteUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = await prisma.user.findUnique({ where: { id: request.params.id } })
  if (!user) throw new NotFoundError('User')

  await prisma.user.delete({ where: { id: user.id } })
  return reply.code(204).send()
}

export async function getStats(_request: FastifyRequest, reply: FastifyReply) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsersThisMonth,
    totalStories,
    newStoriesThisMonth,
    totalChapters,
    totalComments,
    totalReviews,
    totalReads,
    readsThisWeek,
    topStoriesByReads,
    topStoriesByRating,
    ratingDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.story.count(),
    prisma.story.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.chapter.count(),
    prisma.comment.count(),
    prisma.review.count(),
    prisma.chapterReadLog.count(),
    prisma.chapterReadLog.count({ where: { readAt: { gte: sevenDaysAgo } } }),

    // Top 10 stories by total reads
    prisma.story.findMany({
      take: 10,
      orderBy: { chapterReadLogs: { _count: 'desc' } },
      select: {
        id: true, name: true, nameId: true, posterUrl: true,
        _count: { select: { chapterReadLogs: true } },
      },
    }),

    // Top 10 stories by average rating
    prisma.story.findMany({
      take: 10,
      where: { reviews: { some: {} } },
      include: { _count: { select: { reviews: true } } },
      orderBy: { reviews: { _count: 'desc' } },
    }),

    // Rating distribution (1-5)
    prisma.review.groupBy({
      by: ['rating'],
      _count: { rating: true },
      orderBy: { rating: 'asc' },
    }),
  ])

  return reply.send({
    users: { total: totalUsers, newThisMonth: newUsersThisMonth },
    stories: { total: totalStories, newThisMonth: newStoriesThisMonth },
    chapters: { total: totalChapters },
    engagement: { comments: totalComments, reviews: totalReviews },
    reads: { total: totalReads, thisWeek: readsThisWeek },
    topByReads: topStoriesByReads,
    topByRating: topStoriesByRating,
    ratingDistribution,
  })
}
