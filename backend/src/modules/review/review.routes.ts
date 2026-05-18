// src/modules/review/review.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './review.handler'

type StoryIdParam = { Params: { storyId: string } }

export async function reviewRoutes(app: FastifyInstance) {
  app.get<StoryIdParam>('/stories/:storyId/reviews', handler.listReviews)
  app.put<StoryIdParam>('/stories/:storyId/reviews', { preHandler: [requireAuth] }, handler.upsertReview)
  app.delete<StoryIdParam>('/stories/:storyId/reviews', { preHandler: [requireAuth] }, handler.deleteReview)
}
