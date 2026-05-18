// src/modules/chapter/chapter.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './chapter.handler'
import { requireAuth, requireRole } from '../../common/middleware/auth'

type IdParam = { Params: { id: string } }
type StoryIdParam = { Params: { storyId: string } }

export async function chapterRoutes(app: FastifyInstance) {
  // Public — read chapter content
  app.get('/:id', handler.getChapter)

  // Author / Admin — manage chapters
  const authorOnly = { preHandler: [requireRole('author', 'admin')] }
  app.post<StoryIdParam>('/stories/:storyId/chapters', authorOnly, handler.createChapter)
  app.post<StoryIdParam>('/stories/:storyId/chapters/batch', authorOnly, handler.createChaptersBatch)
  app.patch<IdParam>('/:id', authorOnly, handler.updateChapter)
  app.delete<IdParam>('/:id', authorOnly, handler.deleteChapter)

  // Authenticated — log reading progress
  app.post<IdParam>('/:id/read', { preHandler: [requireAuth] }, handler.markChapterRead)
}
