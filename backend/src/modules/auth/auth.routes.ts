// src/modules/auth/auth.routes.ts
import { FastifyInstance } from 'fastify'
import * as handler from './auth.handler'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', handler.register)
  app.post('/login', handler.login)
  app.post('/refresh', handler.refresh)
  app.post('/logout', { preHandler: [app.authenticate] }, handler.logout)
  app.post('/forgot-password', handler.forgotPassword)
  app.post('/reset-password', handler.resetPassword)
}