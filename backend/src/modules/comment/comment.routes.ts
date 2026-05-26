// src/modules/comment/comment.routes.ts
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../common/middleware/auth'
import * as handler from './comment.handler'
import { CommentSchema, CreateCommentBody, ErrorSchema } from '../../config/swagger.schemas'

const tag    = { tags: ['Comments'] }
const bearer = { security: [{ bearerAuth: [] }] }
const storyParam = { type: 'object', properties: { storyId: { type: 'integer' } } }

type StoryIdParam = { Params: { storyId: string } }
type StoryChapterParam = { Params: { storyId: string }; Querystring: { chapterId?: string } }
type IdParam = { Params: { id: string } }

export async function commentRoutes(app: FastifyInstance) {
  app.get<StoryChapterParam>('/stories/:storyId/comments', {
    schema: {
      ...tag,
      summary: 'List comments for a story (or specific chapter)',
      params: storyParam,
      querystring: {
        type: 'object',
        properties: {
          chapterId: {
            anyOf: [{ type: 'integer' }, { type: 'string' }],
            description: 'Filter by chapter (omit for story-level)',
          },
        },
      },
      response: { 200: { type: 'array', items: CommentSchema } },
    },
  }, handler.listComments)

  app.post<StoryIdParam>('/stories/:storyId/comments', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Post a comment (top-level or reply)',
      params: storyParam,
      body: CreateCommentBody,
      response: {
        201: CommentSchema,
        404: { description: 'Story not found', ...ErrorSchema },
      },
    },
  }, handler.createComment)

  app.delete<IdParam>('/comments/:id', {
    preHandler: [requireAuth],
    schema: {
      ...tag, ...bearer,
      summary: 'Delete a comment (own or admin)',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: {
        204: { type: 'null', description: 'Deleted' },
        403: { description: 'Forbidden', ...ErrorSchema },
        404: { description: 'Not found', ...ErrorSchema },
      },
    },
  }, handler.deleteComment)
}