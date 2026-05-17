// src/modules/user/user.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './user.handler'
import { requireAuth } from '../../common/middleware/auth'

export async function userRoutes(app: FastifyInstance) {
  const auth = { preHandler: [requireAuth] }

  app.get('/me', auth, handler.getMe)
  app.patch('/me', auth, handler.updateProfile)
  app.patch('/me/password', auth, handler.changePassword)
  app.put('/me/settings', auth, handler.updateSettings)
  app.get('/me/comments', auth, handler.getMyComments)
  app.get('/me/bookshelf', auth, handler.getMyBookshelf)
  app.get('/me/history', auth, handler.getMyHistory)
}
