// src/modules/admin/admin.routes.ts
import { FastifyInstance } from 'fastify'
import { requireRole } from '../../common/middleware/auth'
import * as handler from './admin.handler'
import { AdminUserListQuery, ChangeRoleBody, ErrorSchema } from '../../config/swagger.schemas'

const tag = { tags: ['Admin'] }
const bearer = { security: [{ bearerAuth: [] }] }
const admin = { preHandler: [requireRole('admin')] }
const idParam = { type: 'object', properties: { id: { type: 'string' } } }

type IdParam = { Params: { id: string } }

export async function adminRoutes(app: FastifyInstance) {
  app.get('/users', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'List users (admin only)',
      querystring: AdminUserListQuery,
      response: { 200: { type: 'object' } },
    },
  }, handler.listUsers)

  app.patch<IdParam>('/users/:id/role', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'Change user role',
      params: idParam,
      body: ChangeRoleBody,
      response: {
        200: { type: 'object' },
        404: { description: 'User not found', ...ErrorSchema },
      },
    },
  }, handler.changeRole)

  app.patch<IdParam>('/users/:id/suspend', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'Suspend user (placeholder)',
      params: idParam,
      response: { 200: { type: 'object' } },
    },
  }, handler.suspendUser)

  app.delete<IdParam>('/users/:id', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'Delete user',
      params: idParam,
      response: {
        204: { type: 'null', description: 'Deleted' },
        404: { description: 'User not found', ...ErrorSchema },
      },
    },
  }, handler.deleteUser)

  app.get('/stats', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'Get admin statistics',
      response: { 200: { type: 'object' } },
    },
  }, handler.getStats)
}
