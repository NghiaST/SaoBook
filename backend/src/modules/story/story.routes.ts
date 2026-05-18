// src/modules/story/story.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './story.handler'
import { requireAuth, requireRole } from '../../common/middleware/auth'

type IdParam = { Params: { id: string } }
type NameIdParam = { Params: { nameId: string } }

export async function storyRoutes(app: FastifyInstance) {
  // Public
  app.get('/', handler.listStories)
  app.get('/:nameId', handler.getStory)
  app.get('/:nameId/chapters', handler.listChapters)

  // Author / Admin
  app.post('/', { preHandler: [requireRole('author', 'admin')] }, handler.createStory)
  app.patch<IdParam>('/:id', { preHandler: [requireRole('author', 'admin')] }, handler.updateStory)
  app.delete<IdParam>('/:id', { preHandler: [requireRole('author', 'admin')] }, handler.deleteStory)

  // My stories
  app.get('/mine', { preHandler: [requireRole('author', 'admin')] }, handler.getMyStories)
}
