// src/modules/user/user.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../../prisma/client'
import { ConflictError, UnauthorizedError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, email: true, name: true,
      bio: true, avatarUrl: true, role: true, createdAt: true,
      settings: true,
    },
  })
  return reply.send(user)
}

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const body = request.body as {
    name?: string; bio?: string; email?: string; avatarUrl?: string
  }

  if (body.email) {
    const existing = await prisma.user.findFirst({
      where: { email: body.email, NOT: { id } },
    })
    if (existing) throw new ConflictError('Email already in use')
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.email && { email: body.email }),
      ...(body.avatarUrl && { avatarUrl: body.avatarUrl }),
    },
    select: { id: true, username: true, email: true, name: true, bio: true, avatarUrl: true },
  })

  return reply.send(user)
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const { currentPassword, newPassword } = request.body as {
    currentPassword: string; newPassword: string
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new UnauthorizedError()

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Current password is incorrect')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id }, data: { passwordHash } })

  return reply.send({ message: 'Password updated' })
}

export async function updateSettings(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const body = request.body as Record<string, unknown>

  const settings = await prisma.userSettings.upsert({
    where: { userId: id },
    create: { userId: id, ...body },
    update: body,
  })

  return reply.send(settings)
}

export async function getMyComments(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const comments = await prisma.comment.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      story: { select: { id: true, name: true, nameId: true } },
      chapter: { select: { id: true, name: true } },
    },
  })
  return reply.send(comments)
}

export async function getMyBookshelf(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const items = await prisma.bookshelf.findMany({
    where: { userId: id },
    orderBy: { savedAt: 'desc' },
    include: {
      story: { select: { id: true, name: true, nameId: true, posterUrl: true } },
    },
  })
  return reply.send(items)
}

export async function getMyHistory(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const history = await prisma.readingHistory.findMany({
    where: { userId: id },
    orderBy: { lastReadAt: 'desc' },
    include: {
      story: { select: { id: true, name: true, nameId: true, posterUrl: true } },
      lastChapter: { select: { id: true, name: true, order: true } },
    },
  })
  return reply.send(history)
}
