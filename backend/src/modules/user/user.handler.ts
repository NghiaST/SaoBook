// src/modules/user/user.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import prisma from '../../prisma/client'
import { ConflictError, UnauthorizedError, ValidationError } from '../../common/exceptions'
import { uploadAvatar } from '../../storage/r2'

type AuthUser = { id: string; role: string }

const defaultRvSettings = {
  voiceName: 'VIETNAMESE_FEMALE',
  language: 'vi',
  gender: 'f',
  pitch: 1,
} as const

const normalizeGender = (gender?: string) => {
  const value = gender?.toLowerCase()
  return value === 'male' || value === 'm' ? 'm' : 'f'
}

const normalizeLanguage = (language?: string) => {
  const value = language?.toLowerCase()
  return value === 'en' || value === 'en-us' ? 'en' : 'vi'
}

const normalizeVoiceName = (voiceName?: string) => {
  const value = voiceName?.trim() ?? 'Vietnamese Female'
  switch (value) {
    case 'Vietnamese Male':
    case 'VIETNAMESE_MALE':
      return 'VIETNAMESE_MALE'
    case 'US English Female':
    case 'US_ENGLISH_FEMALE':
      return 'US_ENGLISH_FEMALE'
    case 'US English Male':
    case 'US_ENGLISH_MALE':
      return 'US_ENGLISH_MALE'
    case 'Vietnamese Female':
    case 'VIETNAMESE_FEMALE':
    default:
      return 'VIETNAMESE_FEMALE'
  }
}

const serializeRvSettings = (rvSettings?: { voiceName?: string; language?: string; gender?: string; pitch?: number }) => ({
  voiceName: rvSettings?.voiceName === 'VIETNAMESE_MALE'
    ? 'Vietnamese Male'
    : rvSettings?.voiceName === 'US_ENGLISH_FEMALE'
      ? 'US English Female'
      : rvSettings?.voiceName === 'US_ENGLISH_MALE'
        ? 'US English Male'
        : 'Vietnamese Female',
  language: rvSettings?.language === 'en' ? 'en' : 'vi',
  gender: rvSettings?.gender === 'm' ? 'male' : 'female',
  pitch: rvSettings?.pitch ?? 1,
})

const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as AuthUser
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, email: true, name: true,
      bio: true, avatarUrl: true, role: true, createdAt: true,
      settings: {
        select: {
          userId: true,
          ttsSpeed: true,
          autoNextChapter: true,
          selectedRvApiKeyId: true,
          rvSettings: {
            select: { voiceName: true, language: true, gender: true, pitch: true },
          },
        },
      },
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
      name: true, bio: true, avatarUrl: true, role: true, createdAt: true,
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
  const {
    selectedRvApiKeyId,
    rvSettings,
    ttsLanguage: _legacyLanguage,
    ttsVoice: _legacyVoice,
    ...settingsBody
  } = body

  const normalizedRvSettings = rvSettings && typeof rvSettings === 'object'
    ? {
      ...(rvSettings as Record<string, unknown>),
      voiceName: normalizeVoiceName(String((rvSettings as Record<string, unknown>).voiceName ?? 'Vietnamese Female')),
      language: normalizeLanguage(String((rvSettings as Record<string, unknown>).language ?? 'vi')),
      gender: normalizeGender(String((rvSettings as Record<string, unknown>).gender ?? 'female')),
      pitch: Number((rvSettings as Record<string, unknown>).pitch ?? 1),
    }
    : undefined
  const rvSettingsData = normalizedRvSettings as Prisma.RvSettingsCreateWithoutUserSettingsInput | undefined

  if (selectedRvApiKeyId !== undefined && selectedRvApiKeyId !== null) {
    const userSettingsId = await prisma.userSettings.upsert({
      where: { userId: id },
      create: { userId: id },
      update: {},
      select: { userId: true },
    })
    const selectedKey = await prisma.rvApiKey.findFirst({
      where: {
        id: selectedRvApiKeyId as string,
        OR: [
          { status: 'public' },
          { status: 'personal', userSettingsId: userSettingsId.userId },
        ],
      },
      select: { id: true },
    })
    if (!selectedKey) throw new ValidationError('The selected ResponsiveVoice API key is unavailable')
  }

  const updateData: Prisma.UserSettingsUpdateInput = {
    ...(settingsBody as Prisma.UserSettingsUpdateInput),
    ...(selectedRvApiKeyId !== undefined ? { selectedRvApiKeyId: selectedRvApiKeyId as string | null } : {}),
    ...(rvSettingsData ? {
      rvSettings: { upsert: { create: rvSettingsData, update: rvSettingsData } },
    } : {}),
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: id },
    create: {
      userId: id,
      ...settingsBody,
      selectedRvApiKeyId: selectedRvApiKeyId as string | null | undefined,
      rvSettings: { create: rvSettingsData ?? defaultRvSettings },
    },
    update: updateData,
    include: { rvSettings: true },
  })

  const response = {
    ...settings,
    rvSettings: settings.rvSettings ? serializeRvSettings(settings.rvSettings) : null,
  }

  return reply.send(response)
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