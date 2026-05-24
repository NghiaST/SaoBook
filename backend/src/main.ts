// src/main.ts
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { setupSwagger } from './config/swagger'

import { config } from './config'
import { AppError } from './common/exceptions'

// Routes
import { authRoutes } from './modules/auth/auth.routes'
import { userRoutes } from './modules/user/user.routes'
import { storyRoutes } from './modules/story/story.routes'
import { chapterRoutes } from './modules/chapter/chapter.routes'
import { commentRoutes } from './modules/comment/comment.routes'
import { reviewRoutes } from './modules/review/review.routes'
import { bookshelfRoutes } from './modules/bookshelf/bookshelf.routes'
import { adminRoutes } from './modules/admin/admin.routes'

const app = Fastify({
  logger: {
    level: config.isDev ? 'info' : 'warn',
    transport: config.isDev ? { target: 'pino-pretty' } : undefined,
  },
})

async function bootstrap() {
  // ── Plugins ──────────────────────────────────────────────────────────────────

  await app.register(helmet)

  await app.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    attachFieldsToBody: true,
  })

  await app.register(jwt, {
    secret: config.jwt.accessSecret,
  })

  // Attach authenticate decorator used in routes
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  // ── Swagger (dev only) ────────────────────────────────────────────────────────

  if (config.isDev) {
    await setupSwagger(app)
  }

  // ── Error handler ─────────────────────────────────────────────────────────────

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      })
    }

    app.log.error(error)
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: config.isDev ? error.message : 'Something went wrong',
    })
  })

  // ── Routes ────────────────────────────────────────────────────────────────────

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(userRoutes, { prefix: '/api/users' })
  app.register(storyRoutes, { prefix: '/api/stories' })
  app.register(chapterRoutes, { prefix: '/api' })
  app.register(commentRoutes, { prefix: '/api' })
  app.register(reviewRoutes, { prefix: '/api' })
  app.register(bookshelfRoutes, { prefix: '/api' })
  app.register(adminRoutes, { prefix: '/api/admin' })

  // Health check
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // ── Start ──────────────────────────────────────────────────────────────────────

  await app.listen({ port: config.port, host: config.host })
  console.log(`Server running on http://${config.host}:${config.port}`)
  if (config.isDev) console.log(`Swagger docs: http://localhost:${config.port}/docs`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
