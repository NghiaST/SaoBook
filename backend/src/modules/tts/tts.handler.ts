// src/modules/tts/tts.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { Readable } from 'node:stream'
import prisma from '../../prisma/client'
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

type AudioRequest = FastifyRequest<{
  Body: {
    text: string
    ttsLanguage?: 'vi' | 'en' | 'zh'
    ttsVoice?: 'male' | 'female'
  }
}>

const languageCodes = {
  vi: 'vi',
  en: 'en-US',
  zh: 'zh-CN',
} as const

const voiceNames = {
  vi: { male: 'Vietnamese Male', female: 'Vietnamese Female' },
  en: { male: 'US English Male', female: 'US English Female' },
  zh: { male: 'Chinese Male', female: 'Chinese Female' },
} as const

async function getUserSettingsId(userId: string) {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  })
  return settings.id
}

export async function streamAudio(request: AudioRequest, reply: FastifyReply) {
  const { id: userId } = request.user as AuthUser
  const { text, ttsLanguage, ttsVoice } = request.body
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true, ttsLanguage: true, ttsVoice: true },
  })
  const language = ttsLanguage ?? settings.ttsLanguage
  const voice = ttsVoice ?? settings.ttsVoice
  const apiKey = await prisma.rvApiKey.findFirst({
    where: {
      OR: [
        { status: 'public' },
        { status: 'personal', userSettingsId: settings.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { key: true },
  })

  if (!apiKey) {
    throw new AppError(503, 'TTS_PROVIDER_UNAVAILABLE', 'No ResponsiveVoice API key is available')
  }

  const providerUrl = new URL('https://code.responsivevoice.org/getvoice.php')
  providerUrl.search = new URLSearchParams({
    t: text,
    tl: languageCodes[language],
    vn: voiceNames[language][voice],
    key: apiKey.key,
  }).toString()

  const providerResponse = await fetch(providerUrl)
  const contentType = providerResponse.headers.get('content-type') ?? ''
  if (!providerResponse.ok || !providerResponse.body || !contentType.startsWith('audio/')) {
    throw new AppError(502, 'TTS_PROVIDER_ERROR', 'ResponsiveVoice could not generate audio')
  }

  reply.type(contentType)
  return reply.send(Readable.fromWeb(providerResponse.body as globalThis.ReadableStream<Uint8Array>))
}

// ── Admin: CRUD keys ──────────────────────────────────────────────────────────

export async function listKeys(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId, role } = request.user as AuthUser
  const userSettingsId = role === 'admin' ? undefined : await getUserSettingsId(userId)
  const keys = await prisma.rvApiKey.findMany({
    where: role === 'admin' ? undefined : { OR: [{ userSettingsId }, { userSettingsId: null }] },
    orderBy: { createdAt: 'asc' },
  })
  return reply.send(keys)
}

export async function createKey(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId, role } = request.user as AuthUser
  const userSettingsId = role === 'admin' ? null : await getUserSettingsId(userId)
  const { label, key } = request.body as { label: string; key: string }
  if (!label || !key) throw new ValidationError('label and key are required')

  const created = await prisma.rvApiKey.create({
    data: {
      label,
      key,
      userSettingsId,
      status: role === 'admin' ? 'public' : 'personal',
    },
  })
  return reply.code(201).send(created)
}

export async function updateKey(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const userSettingsId = role === 'admin' ? null : await getUserSettingsId(userId)
  const { id } = request.params
  const body = request.body as { label?: string; key?: string; status?: 'personal' | 'public' | 'hidden' }

  const existing = await prisma.rvApiKey.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('RvApiKey')
  if (role !== 'admin' && existing.userSettingsId !== userSettingsId) throw new ForbiddenError()

  const updated = await prisma.rvApiKey.update({
    where: { id },
    data: body,
  })
  return reply.send(updated)
}

export async function deleteKey(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const userSettingsId = role === 'admin' ? null : await getUserSettingsId(userId)
  const { id } = request.params
  const existing = await prisma.rvApiKey.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('RvApiKey')
  if (role !== 'admin' && existing.userSettingsId !== userSettingsId) throw new ForbiddenError()

  await prisma.rvApiKey.delete({ where: { id } })
  return reply.code(204).send()
}

// ── Public: list visible keys for the frontend to use round-robin ────────────
// Return only key strings, not IDs or labels, to avoid exposing metadata

export async function getActiveKeys(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId } = request.user as AuthUser
  const userSettingsId = await getUserSettingsId(userId)
  const keys = await prisma.rvApiKey.findMany({
    where: {
      OR: [
        { status: 'public' },
        { status: 'personal', userSettingsId },
      ],
    },
    select: { key: true },
    orderBy: { createdAt: 'asc' },
  })
  return reply.send({ keys: keys.map((k) => k.key) })
}