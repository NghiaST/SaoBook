// src/modules/story/story.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './story.handler'
import { requireRole } from '../../common/middleware/auth'
import {
  StorySchema, CreateStoryBody, StoryListQuery,
  ChapterSchema, ErrorSchema,
} from '../../config/swagger.schemas'

const tag    = { tags: ['Stories'] }
const bearer = { security: [{ bearerAuth: [] }] }

type NameIdParam = { Params: { nameId: string } }
type IdParam = { Params: { id: string } }

export async function storyRoutes(app: FastifyInstance) {
  // ── Public ──────────────────────────────────────────────────────────────────

  app.get('/', {
    schema: {
      ...tag,
      summary: 'List & search stories',
      querystring: StoryListQuery,
      response: {
        200: {
          type: 'object',
          properties: {
            stories: { type: 'array', items: StorySchema },
            total:   { type: 'integer' },
            page:    { type: 'integer' },
            limit:   { type: 'integer' },
          },
        },
      },
    },
  }, handler.listStories)

  app.get('/mine', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Get my stories (author)',
      response: { 200: { type: 'array', items: StorySchema } },
    },
  }, handler.getMyStories)

  app.get<NameIdParam>('/:nameId', {
    schema: {
      ...tag,
      summary: 'Get story detail by slug',
      params: { type: 'object', properties: { nameId: { type: 'string' } } },
      response: {
        200: StorySchema,
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.getStory)

  app.get<NameIdParam>('/:nameId/chapters', {
    schema: {
      ...tag,
      summary: 'List all chapters for a story',
      params: { type: 'object', properties: { nameId: { type: 'string' } } },
      response: { 200: { type: 'array', items: ChapterSchema } },
    },
  }, handler.listChapters)

  // ── Author / Admin ──────────────────────────────────────────────────────────

  app.post('/', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Create a new story',
      consumes: ['multipart/form-data'],
      body: CreateStoryBody,
      response: {
        201: StorySchema,
        409: { description: 'Slug already exists', ...ErrorSchema },
      },
    },
  }, handler.createStory)

  // Multipart route — body schema omitted entirely so Fastify's JSON validator
  // never touches the multipart stream. Swagger UI gets the file picker via
  // the custom 'requestBody' field which @fastify/swagger passes through as-is.
  app.post<IdParam>('/:id/poster', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Upload story poster image (multipart/form-data)',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: {
        200: { type: 'object', properties: { posterUrl: { type: 'string' } } },
        403: { description: 'Forbidden',     ...ErrorSchema },
        404: { description: 'Not found',     ...ErrorSchema },
        422: { description: 'Invalid image', ...ErrorSchema },
      },
    },
  }, handler.uploadStoryPoster)

  app.post<IdParam>('/:id/poster-url', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Upload story poster from remote URL',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', format: 'uri' },
        },
      },
      response: {
        200: { type: 'object', properties: { posterUrl: { type: 'string' } } },
        403: { description: 'Forbidden',   ...ErrorSchema },
        404: { description: 'Not found',   ...ErrorSchema },
        422: { description: 'Invalid URL', ...ErrorSchema },
      },
    },
  }, handler.uploadStoryPosterFromUrl)

  app.patch<IdParam>('/:id', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Update story details',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name:        { type: 'string' },
          description: { type: 'string' },
          posterUrl:   { type: 'string' },
          sourceNote:  { type: 'string' },
        },
      },
      response: {
        200: StorySchema,
        403: { description: 'Not your story', ...ErrorSchema },
        404: { description: 'Not found',      ...ErrorSchema },
      },
    },
  }, handler.updateStory)

  app.delete<IdParam>('/:id', {
    preHandler: [requireRole('author', 'admin')],
    schema: {
      ...tag, ...bearer,
      summary: 'Delete story and all chapters (cascades R2 files)',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: {
        204: { type: 'null', description: 'Deleted' },
        403: { description: 'Forbidden', ...ErrorSchema },
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.deleteStory)
}