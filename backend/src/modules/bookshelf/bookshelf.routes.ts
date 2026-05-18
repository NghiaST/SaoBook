// src/modules/bookshelf/bookshelf.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './bookshelf.handler'

type StoryIdParam = { Params: { storyId: string } }

export async function bookshelfRoutes(app: FastifyInstance) {
  const auth = { preHandler: [requireAuth] }
  app.put<StoryIdParam>('/bookshelf/:storyId', auth, handler.saveStory)
  app.delete<StoryIdParam>('/bookshelf/:storyId', auth, handler.removeStory)
  app.patch<StoryIdParam>('/bookshelf/:storyId/note', auth, handler.updateNote)
}
