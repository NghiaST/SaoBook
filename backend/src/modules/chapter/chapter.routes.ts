// src/modules/chapter/chapter.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './chapter.handler'
import { requireAuth, requireRole } from '../../common/middleware/auth'
import {
  ChapterSchema, CreateChapterBody, BatchChaptersBody, ErrorSchema,
} from '../../config/swagger.schemas'

const tag    = { tags: ['Chapters'] }
const bearer = { security: [{ bearerAuth: [] }] }
const idParam = { type: 'object', properties: { id: { type: 'string' } } }
const storyParam = { type: 'object', properties: { storyId: { type: 'string' } } }

type IdParam = { Params: { id: string } }
type StoryIdParam = { Params: { storyId: string } }

export async function chapterRoutes(app: FastifyInstance) {
  app.get<IdParam>('/chapters/:id', {
    schema: {
      ...tag,
      summary: 'Get chapter by ID (includes contentUrl for R2 fetch)',
      params: idParam,
      response: {
        200: ChapterSchema,
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.getChapter)

  app.post<StoryIdParam>('/stories/:storyId/chapters', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Add a single chapter (content uploaded to R2)',
      params: storyParam,
      body: CreateChapterBody,
      response: {
        201: ChapterSchema,
        403: { description: 'Forbidden', ...ErrorSchema },
        404: { description: 'Story not found', ...ErrorSchema },
      },
    },
  }, handler.createChapter)

  app.post<StoryIdParam>('/stories/:storyId/chapters/batch', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Add multiple chapters at once',
      params: storyParam,
      body: BatchChaptersBody,
      response: {
        201: { type: 'array', items: ChapterSchema },
        403: { description: 'Forbidden', ...ErrorSchema },
      },
    },
  }, handler.createChaptersBatch)

  app.patch<IdParam>('/chapters/:id', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Edit chapter name, order, or content',
      params: idParam,
      body: {
        type: 'object',
        properties: {
          name:    { type: 'string' },
          order:   { type: 'integer' },
          content: { type: 'string', description: 'Replaces content in R2 if provided' },
        },
      },
      response: {
        200: ChapterSchema,
        403: { description: 'Forbidden', ...ErrorSchema },
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.updateChapter)

  app.delete<IdParam>('/chapters/:id', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Delete chapter (removes R2 file)',
      params: idParam,
      response: {
        204: { type: 'null', description: 'Deleted' },
        403: { description: 'Forbidden', ...ErrorSchema },
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.deleteChapter)

  app.post<IdParam>('/chapters/:id/read', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Mark chapter as read (updates ReadingHistory + ChapterReadLog)',
      params: idParam,
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } } },
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.markChapterRead)
}