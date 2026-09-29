// src/modules/tts/tts.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/exceptions'

type AuthUser = { id: string; role: string }

// ── Admin: CRUD keys ──────────────────────────────────────────────────────────

export async function listKeys(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId, role } = request.user as AuthUser
  const keys = await prisma.rvApiKey.findMany({
    where: role === 'admin' ? undefined : { OR: [{ userId }, { userId: null }] },
    orderBy: { createdAt: 'asc' },
  })
  return reply.send(keys)
}

export async function createKey(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId, role } = request.user as AuthUser
  const { label, key } = request.body as { label: string; key: string }
  if (!label || !key) throw new ValidationError('label and key are required')

  const created = await prisma.rvApiKey.create({
    data: {
      label,
      key,
      userId: role === 'admin' ? null : userId,
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
  const { id } = request.params
  const body = request.body as { label?: string; key?: string; status?: 'personal' | 'public' | 'hidden' }

  const existing = await prisma.rvApiKey.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('RvApiKey')
  if (role !== 'admin' && existing.userId !== userId) throw new ForbiddenError()

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
  const { id } = request.params
  const existing = await prisma.rvApiKey.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('RvApiKey')
  if (role !== 'admin' && existing.userId !== userId) throw new ForbiddenError()

  await prisma.rvApiKey.delete({ where: { id } })
  return reply.code(204).send()
}

// ── Public: list visible keys for the frontend to use round-robin ────────────
// Return only key strings, not IDs or labels, to avoid exposing metadata

export async function getActiveKeys(request: FastifyRequest, reply: FastifyReply) {
  const { id: userId } = request.user as AuthUser
  const keys = await prisma.rvApiKey.findMany({
    where: {
      OR: [
        { status: 'public' },
        { status: 'personal', userId },
      ],
    },
    select: { key: true },
    orderBy: { createdAt: 'asc' },
  })
  return reply.send({ keys: keys.map((k) => k.key) })
}