// src/modules/review/review.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './review.handler'
import { ReviewSchema, UpsertReviewBody, ErrorSchema } from '../../config/swagger.schemas'

const tag = { tags: ['Reviews'] }
const bearer = { security: [{ bearerAuth: [] }] }
const storyParam = { type: 'object', properties: { storyId: { type: 'string' } } }

type StoryIdParam = { Params: { storyId: string } }

export async function reviewRoutes(app: FastifyInstance) {
  app.get<StoryIdParam>('/stories/:storyId/reviews', {
    schema: {
      ...tag,
      summary: 'List reviews for a story',
      params: storyParam,
      response: { 200: { type: 'array', items: ReviewSchema } },
    },
  }, handler.listReviews)

  app.put<StoryIdParam>('/stories/:storyId/reviews', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Create or update my review for a story',
      params: storyParam,
      body: UpsertReviewBody,
      response: {
        200: ReviewSchema,
        404: { description: 'Story not found', ...ErrorSchema },
        422: { description: 'Invalid rating', ...ErrorSchema },
      },
    },
  }, handler.upsertReview)

  app.delete<StoryIdParam>('/stories/:storyId/reviews', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Delete my review for a story',
      params: storyParam,
      response: {
        204: { type: 'null', description: 'Deleted' },
        403: { description: 'Forbidden', ...ErrorSchema },
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.deleteReview)
}
