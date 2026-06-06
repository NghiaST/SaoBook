// src/modules/user/user.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './user.handler'
import { requireAuth } from '../../common/middleware/auth'
import {
  UserSchema, UpdateProfileBody, ChangePasswordBody,
  ErrorSchema, CommentSchema,
} from '../../config/swagger.schemas'

const tag    = { tags: ['Users'] }
const bearer = { security: [{ bearerAuth: [] }] }

export async function userRoutes(app: FastifyInstance) {
  const a = { preHandler: [requireAuth] }

  app.get('/me', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Get my profile',
      response: { 200: UserSchema },
    },
  }, handler.getMe)

  app.patch('/me', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Update profile (name, email, bio)',
      body: UpdateProfileBody,
      response: {
        200: UserSchema,
        409: { description: 'Email taken', ...ErrorSchema },
      },
    },
  }, handler.updateProfile)

  // ── Avatar: file upload ───────────────────────────────────────────────────
  app.post('/me/avatar', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Upload avatar image (multipart file, max 5 MB)',
      consumes: ['multipart/form-data'],
      // Không khai báo body properties — để Fastify không validate multipart fields
      response: {
        200: UserSchema,
        422: { description: 'Not an image or too large', ...ErrorSchema },
      },
    },
  }, handler.uploadAvatarHandler)

  // ── Avatar: URL upload ────────────────────────────────────────────────────
  app.post('/me/avatar-from-url', {
    ...a,
    schema: {
      ...tag, ...bearer,
      summary: 'Upload avatar from a remote image URL',
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string' },
        },
      },
      response: {
        200: UserSchema,
        422: { description: 'Invalid URL or not an image', ...ErrorSchema },
      },
    },
  }, handler.uploadAvatarHandler)
  
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