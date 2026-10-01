// src/modules/tts/tts.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { Readable } from 'node:stream'
import { Prisma } from '@prisma/client'
import prisma from '../../prisma/client'
import { config } from '../../config'
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

type AudioRequest = FastifyRequest<{
  Body: {
    text: string
  }
}>

type VoiceRequest = FastifyRequest<{ Querystring: { language?: string } }>

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

const responsiveVoiceUrl = 'https://texttospeech.responsivevoice.org/v2'

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
  const { text } = request.body
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true, ttsLanguage: true, ttsVoice: true, selectedRvApiKeyId: true },
  })
  const apiKey = settings.selectedRvApiKeyId
    ? await prisma.rvApiKey.findFirst({
      where: {
        id: settings.selectedRvApiKeyId,
        OR: [
          { status: 'public' },
          { status: 'personal', userSettingsId: settings.id },
        ],
      },
      select: { key: true, secret: true },
    })
    : await prisma.rvApiKey.findFirst({
      where: {
        OR: [
          { status: 'public' },
          { status: 'personal', userSettingsId: settings.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { key: true, secret: true },
    })

  if (!apiKey) {
    throw new ValidationError('The selected ResponsiveVoice API key is unavailable')
  }

  const apiSecret = apiKey.secret || config.responsiveVoice.apiSecret
  if (!apiSecret) {
    throw new AppError(503, 'TTS_PROVIDER_UNAVAILABLE', 'No ResponsiveVoice API secret is configured')
  }

  const providerResponse = await fetch(`${responsiveVoiceUrl}/text/synthesize`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'X-API-Key': apiKey.key,
      'X-API-Secret': apiSecret,
    },
    body: JSON.stringify({
      text,
      lang: languageCodes[settings.ttsLanguage],
      voice: voiceNames[settings.ttsLanguage][settings.ttsVoice],
    }),
  })
  const contentType = providerResponse.headers.get('content-type') ?? ''
  if (!providerResponse.ok || !providerResponse.body || !contentType.startsWith('audio/')) {
    throw new AppError(502, 'TTS_PROVIDER_ERROR', 'ResponsiveVoice could not generate audio')
  }

  reply.type(contentType)
  return reply.send(Readable.fromWeb(providerResponse.body as globalThis.ReadableStream<Uint8Array>))
}

export async function listVoices(request: VoiceRequest, reply: FastifyReply) {
  const { apiKey, apiSecret } = config.responsiveVoice
  if (!apiKey || !apiSecret) {
    throw new AppError(503, 'TTS_PROVIDER_UNAVAILABLE', 'ResponsiveVoice credentials are not configured')
  }

  const url = new URL(`${responsiveVoiceUrl}/voices`)
  if (request.query.language) url.searchParams.set('language', request.query.language)

  const providerResponse = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'X-API-Key': apiKey,
      'X-API-Secret': apiSecret,
    },
  })
  if (!providerResponse.ok) {
    throw new AppError(502, 'TTS_PROVIDER_ERROR', 'ResponsiveVoice could not list voices')
  }

  const body = await providerResponse.json() as { voices?: unknown }
  return reply.send(Array.isArray(body.voices) ? body.voices : [])
}

// ── Admin: CRUD keys ──────────────────────────────────────────────────────────

export async function listKeys(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId, role } = request.user as AuthUser
  const userSettingsId = role === 'admin' ? undefined : await getUserSettingsId(userId)
  const keys = await prisma.rvApiKey.findMany({
    where: role === 'admin' ? undefined : { OR: [{ userSettingsId }, { userSettingsId: null }] },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userSettingsId: true, label: true, key: true, status: true, createdAt: true, updatedAt: true },
  })
  return reply.send(keys)
}

export async function createKey(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId, role } = request.user as AuthUser
  const userSettingsId = role === 'admin' ? null : await getUserSettingsId(userId)
  const { label, key, secret } = request.body as { label: string; key: string; secret?: string }
  if (!label || !key) throw new ValidationError('label and key are required')

  let created
  try {
    created = await prisma.rvApiKey.create({
      data: {
        label,
        key,
        secret,
        userSettingsId,
        status: role === 'admin' ? 'public' : 'personal',
      },
      select: { id: true, userSettingsId: true, label: true, key: true, status: true, createdAt: true, updatedAt: true },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('ResponsiveVoice API key already exists')
    }
    throw error
  }
  return reply.code(201).send(created)
}

export async function updateKey(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id: userId, role } = request.user as AuthUser
  const userSettingsId = role === 'admin' ? null : await getUserSettingsId(userId)
  const { id } = request.params
  const body = request.body as { label?: string; key?: string; secret?: string; status?: 'personal' | 'public' | 'hidden' }

  const existing = await prisma.rvApiKey.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('RvApiKey')
  if (role !== 'admin' && existing.userSettingsId !== userSettingsId) throw new ForbiddenError()

  let updated
  try {
    updated = await prisma.rvApiKey.update({
      where: { id },
      data: body,
      select: { id: true, userSettingsId: true, label: true, key: true, status: true, createdAt: true, updatedAt: true },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('ResponsiveVoice API key already exists')
    }
    throw error
  }
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