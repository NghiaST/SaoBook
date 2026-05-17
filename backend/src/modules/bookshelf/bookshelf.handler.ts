// src/modules/bookshelf/bookshelf.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../../prisma/client'
import { NotFoundError } from '../../common/exceptions'

type AuthUser = { id: string }

export async function saveStory(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId } = request.user as AuthUser
  const { storyId } = request.params
  const { note } = (request.body as { note?: string }) ?? {}

  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) throw new NotFoundError('Story')

  const item = await prisma.bookshelf.upsert({
    where: { userId_storyId: { userId, storyId } },
    create: { userId, storyId, note },
    update: { note },
  })

  return reply.send(item)
}

export async function removeStory(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId } = request.user as AuthUser
  const { storyId } = request.params

  await prisma.bookshelf.deleteMany({ where: { userId, storyId } })
  return reply.code(204).send()
}

export async function updateNote(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply,
) {
  const { id: userId } = request.user as AuthUser
  const { storyId } = request.params
  const { note } = request.body as { note: string }

  const item = await prisma.bookshelf.update({
    where: { userId_storyId: { userId, storyId } },
    data: { note },
  })

  return reply.send(item)
}
