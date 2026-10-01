// src/modules/admin/admin.routes.ts
import { FastifyInstance } from 'fastify'
import { requireRole } from '../../common/middleware/auth'
import * as handler from './admin.handler'
import {
  AdminUserListQuery, AdminStatsResponse, AdminUsersResponse,
  AdminBookListQuery, AdminBooksResponse, StorySchema,
  ChangeRoleBody, ErrorSchema,
} from '../../config/swagger.schemas'

const tag = { tags: ['Admin'] }
const bearer = { security: [{ bearerAuth: [] }] }
const admin = { preHandler: [requireRole('admin')] }
const idParam = { type: 'object', properties: { id: { type: 'string' } } }

type IdParam = { Params: { id: string } }

export async function adminRoutes(app: FastifyInstance) {
  app.get('/books', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'List books for management (admin only)',
      querystring: AdminBookListQuery,
      response: { 200: AdminBooksResponse },
    },
  }, handler.listBooks)

  app.get('/users', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'List users (admin only)',
      querystring: AdminUserListQuery,
      response: { 200: AdminUsersResponse },
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
      response: { 200: AdminStatsResponse },
    },
  }, handler.getStats)
}
