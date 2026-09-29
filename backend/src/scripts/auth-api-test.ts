import 'dotenv/config'
import { randomUUID } from 'crypto'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const testId = randomUUID().slice(0, 8)
const username = `api_test_${testId}`
const email = `${username}@example.com`
const password = 'AuthTest123!'

interface User {
  id: string
  username: string
  name: string
  role: string
  email?: string
}

interface AuthResponse {
  user?: User
  accessToken?: string
}

interface ApiResponse {
  status: number
  body: Record<string, any>
  cookie?: string
}

async function request(
  path: string,
  options: { method: string; body?: unknown; token?: string; cookie?: string },
): Promise<ApiResponse> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.cookie) headers.cookie = options.cookie

  const response = await fetch(`${apiBase}${path}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()

  let body: Record<string, any> = {}
  if (text) body = JSON.parse(text) as Record<string, any>

  return { status: response.status, body, cookie: response.headers.get('set-cookie') ?? undefined }
}

function expectStatus(result: ApiResponse, expected: number, label: string) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${result.status}: ${JSON.stringify(result.body)}`)
  }
}

function expectCookie(value: string | undefined, label: string) {
  if (!value || !value.includes('refreshToken=')) throw new Error(`${label}: refresh cookie missing`)
}

function expectToken(value: string | undefined, label: string) {
  if (!value) throw new Error(`${label}: token missing from response`)
}

async function main() {
  const health = await request('/../health', { method: 'GET' })
  expectStatus(health, 200, 'health')

  const registerBody = { username, email, name: 'API Test', password }
  const registration = await request('/auth/register', {
    method: 'POST',
    body: registerBody,
  })
  expectStatus(registration, 201, 'register')

  const registrationAuth = registration.body as AuthResponse
  if (registrationAuth.user?.username !== username) {
    throw new Error('register: response user does not match the created account')
  }
  expectToken(registrationAuth.accessToken, 'register accessToken')
  expectCookie(registration.cookie, 'register')

  const duplicate = await request('/auth/register', {
    method: 'POST',
    body: registerBody,
  })
  expectStatus(duplicate, 409, 'duplicate register')

  const emailLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: email, password },
  })
  expectStatus(emailLogin, 200, 'email login')
  const emailAuth = emailLogin.body as AuthResponse
  expectToken(emailAuth.accessToken, 'email login accessToken')
  expectCookie(emailLogin.cookie, 'email login')

  const usernameLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: username, password },
  })
  expectStatus(usernameLogin, 200, 'username login')

  const refresh = await request('/auth/refresh', {
    method: 'POST',
    cookie: emailLogin.cookie,
  })
  expectStatus(refresh, 200, 'refresh')
  expectToken(refresh.body.accessToken, 'refresh accessToken')
  expectCookie(refresh.cookie, 'refresh')

  const logout = await request('/auth/logout', {
    method: 'POST',
    token: emailAuth.accessToken,
  })
  expectStatus(logout, 200, 'logout')

  const invalidLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: email, password: 'wrong-password' },
  })
  expectStatus(invalidLogin, 401, 'invalid login')

  const invalidRefresh = await request('/auth/refresh', {
    method: 'POST',
  })
  expectStatus(invalidRefresh, 401, 'invalid refresh')

  const forgotPassword = await request('/auth/forgot-password', {
    method: 'POST',
    body: { email: `unknown_${testId}@example.com` },
  })
  expectStatus(forgotPassword, 200, 'forgot password for unknown email')

  const resetPassword = await request('/auth/reset-password', {
    method: 'POST',
    body: { token: 'invalid-token', newPassword: 'NewAuthTest123!' },
  })
  expectStatus(resetPassword, 422, 'invalid reset token')

  console.log('Auth API test passed:', { username, email })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})