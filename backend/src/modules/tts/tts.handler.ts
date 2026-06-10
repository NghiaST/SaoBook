// src/modules/tts/tts.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError, ValidationError } from '../../common/exceptions'

// ── Admin: CRUD keys ──────────────────────────────────────────────────────────

export async function listKeys(_req: FastifyRequest, reply: FastifyReply) {
  const keys = await prisma.rvApiKey.findMany({
    orderBy: { createdAt: 'asc' },
  })
  return reply.send(keys)
}

export async function createKey(request: FastifyRequest, reply: FastifyReply) {
  const { label, key } = request.body as { label: string; key: string }
  if (!label || !key) throw new ValidationError('label and key are required')

  const created = await prisma.rvApiKey.create({
    data: { label, key },
  })
  return reply.code(201).send(created)
}

export async function updateKey(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id } = request.params
  const body = request.body as { label?: string; key?: string; active?: boolean }

  const existing = await prisma.rvApiKey.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('RvApiKey')

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
  const { id } = request.params
  const existing = await prisma.rvApiKey.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('RvApiKey')

  await prisma.rvApiKey.delete({ where: { id } })
  return reply.code(204).send()
}

// ── Public: lấy danh sách key active để FE dùng round-robin ──────────────────
// Chỉ trả về key string (không trả id/label) để tránh lộ metadata

export async function getActiveKeys(_req: FastifyRequest, reply: FastifyReply) {
  const keys = await prisma.rvApiKey.findMany({
    where: { active: true },
    select: { key: true },
    orderBy: { createdAt: 'asc' },
  })
  return reply.send({ keys: keys.map((k) => k.key) })
}