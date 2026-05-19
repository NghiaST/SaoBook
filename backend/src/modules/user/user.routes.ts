// src/modules/user/user.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './user.handler'
import { requireAuth } from '../../common/middleware/auth'
import {
  UserSchema, UpdateProfileBody, ChangePasswordBody,
  ErrorSchema, CommentSchema, BookshelfBody,
} from '../../config/swagger.schemas'

const tag    = { tags: ['Users'] }
const bearer = { security: [{ bearerAuth: [] }] }
const auth   = (app: FastifyInstance) => ({ preHandler: [requireAuth] })

export async function userRoutes(app: FastifyInstance) {
  const a = { preHandler: [requireAuth] }

  app.get('/me', { ...a, schema: { ...tag, ...bearer, summary: 'Get my profile', response: { 200: UserSchema } } }, handler.getMe)

  app.patch('/me', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Update profile (name, email, bio, avatar)',
      body: UpdateProfileBody,
      response: { 200: UserSchema, 409: { description: 'Email taken', ...ErrorSchema } },
    },
  }, handler.updateProfile)

  app.patch('/me/password', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Change password',
      body: ChangePasswordBody,
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
        401: { description: 'Wrong current password', ...ErrorSchema },
      },
    },
  }, handler.changePassword)

  app.put('/me/settings', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Update TTS + UI settings',
      body: {
        type: 'object',
        properties: {
          ttsLanguage:       { type: 'string', enum: ['vi', 'en', 'zh'] },
          ttsVoice:          { type: 'string', enum: ['male', 'female'] },
          ttsSpeed:          { type: 'number', minimum: 0.5, maximum: 5 },
          ttsVolume:         { type: 'number', minimum: 0, maximum: 1 },
          autoNextChapter:   { type: 'boolean' },
          sleepTimerMinutes: { type: 'integer' },
          theme:             { type: 'string', enum: ['light', 'dark'] },
          bgColor:           { type: 'string' },
          textColor:         { type: 'string' },
          fontFamily:        { type: 'string' },
          fontSize:          { type: 'integer' },
          lineHeight:        { type: 'number' },
        },
      },
      response: { 200: { type: 'object', description: 'Updated settings' } },
    },
  }, handler.updateSettings)

  app.get('/me/comments', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Get all my comments',
      response: { 200: { type: 'array', items: CommentSchema } },
    },
  }, handler.getMyComments)

  app.get('/me/bookshelf', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Get my bookshelf',
      response: { 200: { type: 'array', items: { type: 'object' } } },
    },
  }, handler.getMyBookshelf)

  app.get('/me/history', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Get reading history (last chapter per story)',
      response: { 200: { type: 'array', items: { type: 'object' } } },
    },
  }, handler.getMyHistory)
}