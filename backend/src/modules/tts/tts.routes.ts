// src/modules/tts/tts.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './tts.handler'
import { ErrorSchema } from '../../config/swagger.schemas'

const tag    = { tags: ['TTS'] }
const bearer = { security: [{ bearerAuth: [] }] }
const auth   = { preHandler: [requireAuth] }

const idParam = {
  type: 'object',
  properties: { id: { type: 'string' } },
}

type IdParam = { Params: { id: string } }

const KeySchema = {
  type: 'object',
  properties: {
    id:        { type: 'string' },
    userId:    { type: 'string', nullable: true, description: 'Owner ID; null for an admin-managed global key' },
    label:     { type: 'string' },
    key:       { type: 'string' },
    status:    { type: 'string', enum: ['personal', 'public', 'hidden'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}

export async function ttsRoutes(app: FastifyInstance) {
  // ── Public: frontend fetches visible keys for ResponsiveVoice ──────────────
  // Require authentication to prevent excessive key scraping
  app.get('/keys/active', {
    ...auth,
    schema: {
      ...tag, ...bearer,
      summary: 'Get visible RV API keys for the current user',
      description: 'Returns public keys and personal keys owned by the authenticated user.',
      response: {
        200: {
          type: 'object',
          properties: {
            keys: { type: 'array', items: { type: 'string' } },
          },
        },
        401: { description: 'Authentication required', ...ErrorSchema },
      },
    },
  }, handler.getActiveKeys)

  // ── Authenticated users manage their own keys; admins manage all keys ──────
  app.get('/keys', {
    ...auth,
    schema: {
      ...tag, ...bearer,
      summary: 'List available RV API keys',
      description: 'Regular users receive their own and global keys. Admins receive all keys.',
      response: {
        200: { type: 'array', items: KeySchema },
        401: { description: 'Authentication required', ...ErrorSchema },
      },
    },
  }, handler.listKeys)

  app.post('/keys', {
    ...auth,
    schema: {
      ...tag, ...bearer,
      summary: 'Create an RV API key',
      description: 'The key belongs to the authenticated user. Admin-created keys are global.',
      body: {
        type: 'object',
        required: ['label', 'key'],
        properties: {
          label: { type: 'string' },
          key:   { type: 'string' },
        },
      },
      response: {
        201: KeySchema,
        401: { description: 'Authentication required', ...ErrorSchema },
        422: { description: 'Invalid key data', ...ErrorSchema },
      },
    },
  }, handler.createKey)

  app.patch<IdParam>('/keys/:id', {
    ...auth,
    schema: {
      ...tag, ...bearer,
      summary: 'Update an RV API key',
      description: 'Users can update their own keys. Admins can update any key.',
      params: idParam,
      body: {
        type: 'object',
        properties: {
          label:  { type: 'string' },
          key:    { type: 'string' },
          status: { type: 'string', enum: ['personal', 'public', 'hidden'] },
        },
      },
      response: {
        200: KeySchema,
        401: { description: 'Authentication required', ...ErrorSchema },
        403: { description: 'Key belongs to another user', ...ErrorSchema },
        404: { description: 'Key not found', ...ErrorSchema },
      },
    },
  }, handler.updateKey)

  app.delete<IdParam>('/keys/:id', {
    ...auth,
    schema: {
      ...tag, ...bearer,
      summary: 'Delete an RV API key',
      description: 'Users can delete their own keys. Admins can delete any key.',
      params: idParam,
      response: {
        204: { type: 'null' },
        401: { description: 'Authentication required', ...ErrorSchema },
        403: { description: 'Key belongs to another user', ...ErrorSchema },
        404: { description: 'Key not found', ...ErrorSchema },
      },
    },
  }, handler.deleteKey)
}