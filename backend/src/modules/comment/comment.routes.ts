// src/modules/comment/comment.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './comment.handler'

type IdParam = { Params: { id: string } }
type StoryIdParam = { Params: { storyId: string } }
type StoryChapterIdParam = { Params: { storyId: string }; Querystring: { chapterId?: string } }

export async function commentRoutes(app: FastifyInstance) {
  const auth = { preHandler: [requireAuth] }
  app.get<StoryChapterIdParam>('/stories/:storyId/comments', handler.listComments)
  app.post<StoryIdParam>('/stories/:storyId/comments', auth, handler.createComment)
  app.delete<IdParam>('/comments/:id', auth, handler.deleteComment)
}
