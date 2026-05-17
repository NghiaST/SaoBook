// src/modules/auth/auth.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import prisma from '../../prisma/client'
import { config } from '../../config'
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions'
import { sendPasswordResetEmail } from './auth.email'

// ── Register ──────────────────────────────────────────────────────────────────

interface RegisterBody {
  username: string
  email: string
  name: string
  password: string
}

export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  const { username, email, name, password } = request.body

  if (!username || !email || !name || !password) {
    throw new ValidationError('username, email, name and password are required')
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters')
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  })
  if (existing) {
    throw new ConflictError(
      existing.username === username
        ? 'Username already taken'
        : 'Email already registered',
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      username,
      email,
      name,
      passwordHash,
      settings: { create: {} }, // default settings
    },
    select: { id: true, username: true, email: true, name: true, role: true },
  })

  const { accessToken, refreshToken } = signTokens(request, user)

  return reply.code(201).send({ user, accessToken, refreshToken })
}

// ── Login ─────────────────────────────────────────────────────────────────────

interface LoginBody {
  identifier: string // username or email
  password: string
}

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) {
  const { identifier, password } = request.body

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }],
    },
  })

  const valid =
    user && (await bcrypt.compare(password, user.passwordHash))

  // Always throw the same error to avoid username enumeration
  if (!valid) throw new UnauthorizedError('Invalid credentials')

  const payload = { id: user.id, username: user.username, role: user.role }
  const { accessToken, refreshToken } = signTokens(request, payload)

  return reply.send({
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  })
}

// ── Refresh ───────────────────────────────────────────────────────────────────

interface RefreshBody {
  refreshToken: string
}

export async function refresh(
  request: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply,
) {
  try {
    const payload = request.server.jwt.verify<{
      id: string
      username: string
      role: string
    }>(request.body.refreshToken, { key: config.jwt.refreshSecret })

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, role: true },
    })
    if (!user) throw new UnauthorizedError()

    const { accessToken, refreshToken } = signTokens(request, user)
    return reply.send({ accessToken, refreshToken })
  } catch {
    throw new UnauthorizedError('Invalid refresh token')
  }
}

// ── Logout (client-side — just acknowledge) ───────────────────────────────────

export async function logout(_request: FastifyRequest, reply: FastifyReply) {
  // With JWT, logout is client-side (discard tokens).
  // For server-side invalidation, add a token blacklist (Redis).
  return reply.send({ message: 'Logged out' })
}

// ── Forgot Password ───────────────────────────────────────────────────────────

interface ForgotPasswordBody {
  email: string
}

export async function forgotPassword(
  request: FastifyRequest<{ Body: ForgotPasswordBody }>,
  reply: FastifyReply,
) {
  const { email } = request.body

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to prevent email enumeration
  if (user) {
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    })

    await sendPasswordResetEmail(email, user.name, token)
  }

  return reply.send({
    message: 'If that email is registered, a reset link has been sent.',
  })
}

// ── Reset Password ────────────────────────────────────────────────────────────

interface ResetPasswordBody {
  token: string
  newPassword: string
}

export async function resetPassword(
  request: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply,
) {
  const { token, newPassword } = request.body

  if (!newPassword || newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters')
  }

  const reset = await prisma.passwordReset.findUnique({ where: { token } })

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw new ValidationError('Reset token is invalid or has expired')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ])

  return reply.send({ message: 'Password reset successfully' })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function signTokens(
  request: FastifyRequest,
  payload: { id: string; username: string; role: string },
) {
  const accessToken = request.server.jwt.sign(payload, {
    expiresIn: config.jwt.accessExpiresIn,
  })
  const refreshToken = request.server.jwt.sign(payload, {
    key: config.jwt.refreshSecret,
    expiresIn: config.jwt.refreshExpiresIn,
  } as any)

  return { accessToken, refreshToken }
}