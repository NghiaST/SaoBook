// src/modules/tts/tts.routes.ts
import { FastifyInstance } from 'fastify'
import { requireRole } from '../../common/middleware/auth'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './tts.handler'

const tag    = { tags: ['TTS'] }
const bearer = { security: [{ bearerAuth: [] }] }
const admin  = { preHandler: [requireRole('admin')] }
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
    label:     { type: 'string' },
    key:       { type: 'string' },
    active:    { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}

export async function ttsRoutes(app: FastifyInstance) {
  // ── Public: FE lấy active keys để gọi ResponsiveVoice ──────────────────────
  // Yêu cầu đăng nhập để tránh scraping key vô tội vạ
  app.get('/keys/active', {
    ...auth,
    schema: {
      ...tag, ...bearer,
      summary: 'Get active RV API keys (authenticated users)',
      response: {
        200: {
          type: 'object',
          properties: {
            keys: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, handler.getActiveKeys)

  // ── Admin: quản lý keys ─────────────────────────────────────────────────────
  app.get('/keys', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'List all RV API keys (admin)',
      response: { 200: { type: 'array', items: KeySchema } },
    },
  }, handler.listKeys)

  app.post('/keys', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'Create RV API key (admin)',
      body: {
        type: 'object',
        required: ['label', 'key'],
        properties: {
          label: { type: 'string' },
          key:   { type: 'string' },
        },
      },
      response: { 201: KeySchema },
    },
  }, handler.createKey)

  app.patch<IdParam>('/keys/:id', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'Update RV API key (admin)',
      params: idParam,
      body: {
        type: 'object',
        properties: {
          label:  { type: 'string' },
          key:    { type: 'string' },
          active: { type: 'boolean' },
        },
      },
      response: { 200: KeySchema },
    },
  }, handler.updateKey)

  app.delete<IdParam>('/keys/:id', {
    ...admin,
    schema: {
      ...tag, ...bearer,
      summary: 'Delete RV API key (admin)',
      params: idParam,
      response: { 204: { type: 'null' } },
    },
  }, handler.deleteKey)
}