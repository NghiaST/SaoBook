// src/modules/upload/upload.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './upload.handler'
import { ErrorSchema } from '../../config/swagger.schemas'

const tag    = { tags: ['Upload'] }
const bearer = { security: [{ bearerAuth: [] }] }

export async function uploadRoutes(app: FastifyInstance) {
  // Upload image file → R2, returns public URL
  app.post('/image', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Upload an image file to R2 (poster, avatar…)',
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['file'],
        properties: {
          file: { type: 'string', format: 'binary', description: 'Image file, max 10MB' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { url: { type: 'string', description: 'Public R2 URL' } },
        },
        422: { description: 'Not an image or too large', ...ErrorSchema },
      },
    },
  }, handler.uploadImage)

  // Fetch remote image URL → R2, returns public URL
  app.post('/image-from-url', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Fetch a remote image URL and store it in R2',
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', description: 'Public image URL to fetch' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { url: { type: 'string', description: 'Public R2 URL' } },
        },
        422: { description: 'Invalid URL or not an image', ...ErrorSchema },
      },
    },
  }, handler.uploadImageFromUrl)
}
