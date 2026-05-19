// src/modules/auth/auth.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './auth.handler'
import {
  RegisterBody, LoginBody, RefreshBody,
  ForgotPasswordBody, ResetPasswordBody,
  AuthResponse, ErrorSchema,
} from '../../config/swagger.schemas'

const tag    = { tags: ['Auth'] }
const bearer = { security: [{ bearerAuth: [] }] }

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    schema: {
      ...tag,
      summary: 'Register a new account',
      body: RegisterBody,
      response: {
        201: { description: 'Created', ...AuthResponse },
        409: { description: 'Username or email taken', ...ErrorSchema },
        422: { description: 'Validation error', ...ErrorSchema },
      },
    },
  }, handler.register)

  app.post('/login', {
    schema: {
      ...tag,
      summary: 'Login with username or email',
      body: LoginBody,
      response: {
        200: { description: 'Success', ...AuthResponse },
        401: { description: 'Invalid credentials', ...ErrorSchema },
      },
    },
  }, handler.login)

  app.post('/refresh', {
    schema: {
      ...tag,
      summary: 'Refresh access token',
      body: RefreshBody,
      response: {
        200: { description: 'New token pair', ...AuthResponse },
        401: { description: 'Invalid refresh token', ...ErrorSchema },
      },
    },
  }, handler.refresh)

  app.post('/logout', {
    preHandler: [app.authenticate],
    schema: {
      ...tag, ...bearer,
      summary: 'Logout',
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, handler.logout)

  app.post('/forgot-password', {
    schema: {
      ...tag,
      summary: 'Request a password reset email',
      body: ForgotPasswordBody,
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, handler.forgotPassword)

  app.post('/reset-password', {
    schema: {
      ...tag,
      summary: 'Reset password using token from email',
      body: ResetPasswordBody,
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
        422: { description: 'Token invalid or expired', ...ErrorSchema },
      },
    },
  }, handler.resetPassword)
}