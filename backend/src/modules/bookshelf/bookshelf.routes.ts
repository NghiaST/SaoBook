// src/modules/bookshelf/bookshelf.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './bookshelf.handler'

export async function bookshelfRoutes(app: FastifyInstance) {
  const auth = { preHandler: [requireAuth] }
  app.put('/bookshelf/:storyId', auth, handler.saveStory)
  app.delete('/bookshelf/:storyId', auth, handler.removeStory)
  app.patch('/bookshelf/:storyId/note', auth, handler.updateNote)
}
