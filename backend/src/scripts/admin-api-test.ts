import 'dotenv/config'
import { randomUUID } from 'crypto'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const adminUsername = process.env.ADMIN_USERNAME ?? ''
const adminPassword = process.env.ADMIN_PASSWORD ?? ''

if (!adminUsername || !adminPassword) {
  console.error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in env')
  process.exit(1)
}

interface ApiResponse { status: number; body: any }

async function request(path: string, options: { method: string; body?: unknown; token?: string }): Promise<ApiResponse> {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method,
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

function expectStatus(result: ApiResponse, expected: number, label: string) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${result.status}: ${JSON.stringify(result.body)}`)
  }
}

async function main() {
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: adminUsername, password: adminPassword },
  })
  expectStatus(adminLogin, 200, 'admin login')
  const adminToken = adminLogin.body.accessToken
  if (!adminToken) throw new Error('admin login: access token missing')

  const testId = randomUUID().slice(0, 8)
  const testUser = {
    username: `admin_api_${testId}`,
    email: `admin_api_${testId}@example.com`,
    name: 'Admin API Test User',
    password: 'AdminApiTest123!',
  }
  let userId: string | undefined

  try {
    const registration = await request('/auth/register', { method: 'POST', body: testUser })
    expectStatus(registration, 201, 'register test user')
    userId = registration.body.user?.id
    if (!userId) throw new Error('register test user: id missing')

    const forbidden = await request('/admin/users', { method: 'GET', token: registration.body.accessToken })
    expectStatus(forbidden, 403, 'non-admin user list')

    const users = await request('/admin/users?q=admin_api_', { method: 'GET', token: adminToken })
    expectStatus(users, 200, 'list users')
    if (!Array.isArray(users.body.users) || typeof users.body.total !== 'number') {
      throw new Error(`list users: response fields missing: ${JSON.stringify(users.body)}`)
    }

    const stats = await request('/admin/stats', { method: 'GET', token: adminToken })
    expectStatus(stats, 200, 'get stats')
    if (
      typeof stats.body.users?.total !== 'number' ||
      typeof stats.body.stories?.total !== 'number' ||
      typeof stats.body.reads?.total !== 'number' ||
      typeof stats.body.engagement?.comments !== 'number' ||
      !Array.isArray(stats.body.topByReads) ||
      !Array.isArray(stats.body.ratingDistribution)
    ) {
      throw new Error(`get stats: response fields missing: ${JSON.stringify(stats.body)}`)
    }

    const role = await request(`/admin/users/${userId}/role`, {
      method: 'PATCH', token: adminToken, body: { role: 'author' },
    })
    expectStatus(role, 200, 'change user role')

    const deleted = await request(`/admin/users/${userId}`, { method: 'DELETE', token: adminToken })
    expectStatus(deleted, 204, 'delete user')
    userId = undefined

    const removedUser = await request(`/admin/users/${registration.body.user.id}/role`, {
      method: 'PATCH', token: adminToken, body: { role: 'user' },
    })
    expectStatus(removedUser, 404, 'deleted user is unavailable')

    console.log('Admin API test passed:', { username: testUser.username })
  } finally {
    if (userId !== undefined) {
      const cleanup = await request(`/admin/users/${userId}`, { method: 'DELETE', token: adminToken })
      expectStatus(cleanup, 204, 'cleanup test user')
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1) })