// src/modules/bookshelf/bookshelf.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './bookshelf.handler'
import { BookshelfBody, ErrorSchema } from '../../config/swagger.schemas'

const tag = { tags: ['Bookshelf'] }
const bearer = { security: [{ bearerAuth: [] }] }
const storyParam = { type: 'object', properties: { storyId: { type: 'integer' } } }

type StoryIdParam = { Params: { storyId: string } }

export async function bookshelfRoutes(app: FastifyInstance) {
  app.put<StoryIdParam>('/bookshelf/:storyId', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Save a story to my bookshelf (upsert note)',
      params: storyParam,
      body: BookshelfBody,
      response: {
        200: { type: 'object' },
        404: { description: 'Story not found', ...ErrorSchema },
      },
    },
  }, handler.saveStory)

  app.patch<StoryIdParam>('/bookshelf/:storyId', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Update bookshelf note for a story',
      params: storyParam,
      body: BookshelfBody,
      response: {
        200: { type: 'object' },
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.updateNote)

  app.delete<StoryIdParam>('/bookshelf/:storyId', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Remove a story from my bookshelf',
      params: storyParam,
      response: {
        204: { type: 'null', description: 'Deleted' },
      },
    },
  }, handler.removeStory)
}
