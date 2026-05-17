// src/modules/admin/admin.routes.ts
import { FastifyInstance } from 'fastify'
import { requireRole } from '../../common/middleware/auth'
import * as handler from './admin.handler'

type IdParam = { Params: { id: string } }

export async function adminRoutes(app: FastifyInstance) {
  const admin = { preHandler: [requireRole('admin')] }

  // User management
  app.get('/users', admin, handler.listUsers)
  app.patch<IdParam>('/users/:id/role', admin, handler.changeRole)
  app.patch<IdParam>('/users/:id/suspend', admin, handler.suspendUser)
  app.delete<IdParam>('/users/:id', admin, handler.deleteUser)

  // Statistics
  app.get('/stats', admin, handler.getStats)
}
