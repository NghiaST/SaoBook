// src/modules/chapter/chapter.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './chapter.handler'
import { requireAuth, requireRole } from '../../common/middleware/auth'

export async function chapterRoutes(app: FastifyInstance) {
  // Public — read chapter content
  app.get('/:id', handler.getChapter)

  // Author / Admin — manage chapters
  const authorOnly = { preHandler: [requireRole('author', 'admin')] }
  app.post('/stories/:storyId/chapters', authorOnly, handler.createChapter)
  app.post('/stories/:storyId/chapters/batch', authorOnly, handler.createChaptersBatch)
  app.patch('/:id', authorOnly, handler.updateChapter)
  app.delete('/:id', authorOnly, handler.deleteChapter)

  // Authenticated — log reading progress
  app.post('/:id/read', { preHandler: [requireAuth] }, handler.markChapterRead)
}
