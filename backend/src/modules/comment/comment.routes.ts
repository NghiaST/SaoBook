// src/modules/comment/comment.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './comment.handler'

export async function commentRoutes(app: FastifyInstance) {
  const auth = { preHandler: [requireAuth] }
  app.get('/stories/:storyId/comments', handler.listComments)
  app.post('/stories/:storyId/comments', auth, handler.createComment)
  app.delete('/comments/:id', auth, handler.deleteComment)
}
