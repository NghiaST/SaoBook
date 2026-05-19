// src/config/swagger.ts
import { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export async function setupSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Story App API',
        description: 'Backend API for the story reading app — auth, stories, chapters, TTS settings, reviews, comments, bookshelf, and admin.',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development' },
        { url: 'https://your-backend.onrender.com', description: 'Production' },
      ],
      tags: [
        { name: 'Auth',      description: 'Register, login, token refresh, password recovery' },
        { name: 'Users',     description: 'Profile, settings, reading history, bookshelf, comments' },
        { name: 'Stories',   description: 'Browse, search, create and manage stories' },
        { name: 'Chapters',  description: 'Chapter CRUD, batch upload, reading progress' },
        { name: 'Comments',  description: 'Threaded comments on stories and chapters' },
        { name: 'Reviews',   description: 'Star ratings and written reviews' },
        { name: 'Bookshelf', description: 'Save stories with personal notes' },
        { name: 'Admin',     description: 'User management and platform statistics' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Paste your access token here (obtained from /api/auth/login)',
          },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',       // show all tags expanded
      deepLinking: true,
      persistAuthorization: true, // keeps the JWT between page refreshes
    },
    staticCSP: true,
  })
}