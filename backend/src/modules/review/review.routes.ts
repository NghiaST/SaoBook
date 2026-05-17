// src/modules/review/review.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './review.handler'

export async function reviewRoutes(app: FastifyInstance) {
  app.get('/stories/:storyId/reviews', handler.listReviews)
  app.put('/stories/:storyId/reviews', { preHandler: [requireAuth] }, handler.upsertReview)
  app.delete('/stories/:storyId/reviews', { preHandler: [requireAuth] }, handler.deleteReview)
}
