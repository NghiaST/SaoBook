// src/modules/user/user.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../../prisma/client'
import { ConflictError, UnauthorizedError, ValidationError } from '../../common/exceptions'
import { uploadAvatar } from '../../storage/r2'

type AuthUser = { id: string; role: string }

const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

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
      ...(body.name      !== undefined && { name: body.name }),
      ...(body.bio       !== undefined && { bio: body.bio }),
      ...(body.email     !== undefined && { email: body.email }),
      ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
    },
    select: {
      id: true, username: true, email: true,
      name: true, bio: true, avatarUrl: true,
    },
  })

  return reply.send(user)
}

export async function uploadAvatarHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const contentType = request.headers['content-type'] ?? ''

  let buffer: Buffer
  let mimeType: string

  if (contentType.includes('multipart/form-data')) {
    // ── File upload ──────────────────────────────────────────────────────────
    const body = request.body as { file?: any }
    let file = body?.file
    if (!file && typeof (request as any).file === 'function') {
      file = await (request as any).file()
    }
    if (!file) throw new ValidationError('No file provided')

    mimeType = file.mimetype ?? file.type ?? ''
    buffer = typeof file.toBuffer === 'function'
      ? await file.toBuffer()
      : Buffer.from(file.data ?? file._buf ?? '')

  } else {
    // ── URL upload ───────────────────────────────────────────────────────────
    const { url } = request.body as { url?: string }
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new ValidationError('A valid http/https URL is required')
    }

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    } catch {
      throw new ValidationError('Could not reach the URL')
    }
    if (!response.ok) throw new ValidationError('URL returned a non-200 response')

    mimeType = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
    buffer = Buffer.from(await response.arrayBuffer())
  }

  if (!ALLOWED_AVATAR_MIME.includes(mimeType)) {
    throw new ValidationError('File must be an image (JPEG, PNG, WebP, GIF, AVIF)')
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new ValidationError('Avatar must be 5 MB or smaller')
  }

  const avatarUrl = await uploadAvatar(buffer, mimeType, id)

  const user = await prisma.user.update({
    where: { id },
    data: { avatarUrl },
    select: {
      id: true, username: true, email: true,
      name: true, bio: true, avatarUrl: true,
    },
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