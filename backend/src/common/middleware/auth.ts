// src/common/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError, ForbiddenError } from '../exceptions'
import { Role } from '@prisma/client'

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify()
  } catch {
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    await requireAuth(request, _reply)
    const user = request.user as { role: Role }
    if (!roles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }
  }
}