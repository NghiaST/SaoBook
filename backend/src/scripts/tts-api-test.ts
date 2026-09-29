import 'dotenv/config'
import { randomUUID } from 'crypto'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const adminUsername = process.env.ADMIN_USERNAME ?? ''
const adminPassword = process.env.ADMIN_PASSWORD ?? ''
const username = process.env.USER_USERNAME ?? ''
const password = process.env.USER_PASSWORD ?? ''

if (!adminUsername || !adminPassword || !username || !password) {
  console.error('Missing ADMIN_USERNAME, ADMIN_PASSWORD, USER_USERNAME, or USER_PASSWORD in env')
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

async function login(identifier: string, loginPassword: string, label: string) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { identifier, password: loginPassword },
  })
  expectStatus(result, 200, `${label} login`)
  if (!result.body.accessToken) throw new Error(`${label} login: access token missing`)
  return result.body.accessToken as string
}

async function main() {
  const adminToken = await login(adminUsername, adminPassword, 'admin')
  const userToken = await login(username, password, 'user')
  const testId = randomUUID().slice(0, 8)
  const label = `TTS API Test ${testId}`
  const key = `tts-test-key-${testId}`
  let keyId: string | undefined

  try {
    const unauthenticated = await request('/tts/keys/active', { method: 'GET' })
    expectStatus(unauthenticated, 401, 'unauthenticated active keys')

    const created = await request('/tts/keys', {
      method: 'POST', token: adminToken, body: { label, key },
    })
    expectStatus(created, 201, 'create TTS key')
    keyId = created.body.id
    if (!keyId) throw new Error('create TTS key: id missing')
    if (created.body.label !== label || created.body.key !== key || created.body.active !== true) {
      throw new Error('create TTS key: response does not match the created key')
    }

    const listed = await request('/tts/keys', { method: 'GET', token: adminToken })
    expectStatus(listed, 200, 'list TTS keys')
    if (!Array.isArray(listed.body) || !listed.body.some((item: any) => item.id === keyId)) {
      throw new Error('list TTS keys: created key was not found')
    }

    const updated = await request(`/tts/keys/${keyId}`, {
      method: 'PATCH', token: adminToken, body: { label: `${label} Updated`, active: false },
    })
    expectStatus(updated, 200, 'update TTS key')
    if (updated.body.label !== `${label} Updated` || updated.body.active !== false) {
      throw new Error('update TTS key: values were not updated')
    }

    const activeAfterDisable = await request('/tts/keys/active', { method: 'GET', token: userToken })
    expectStatus(activeAfterDisable, 200, 'list active TTS keys after disable')
    if (!Array.isArray(activeAfterDisable.body.keys) || activeAfterDisable.body.keys.includes(key)) {
      throw new Error('list active TTS keys: disabled key was returned')
    }

    const enabled = await request(`/tts/keys/${keyId}`, {
      method: 'PATCH', token: adminToken, body: { active: true },
    })
    expectStatus(enabled, 200, 'enable TTS key')

    const active = await request('/tts/keys/active', { method: 'GET', token: userToken })
    expectStatus(active, 200, 'list active TTS keys')
    if (!Array.isArray(active.body.keys) || !active.body.keys.includes(key)) {
      throw new Error('list active TTS keys: enabled key was not returned')
    }

    const deleted = await request(`/tts/keys/${keyId}`, { method: 'DELETE', token: adminToken })
    expectStatus(deleted, 204, 'delete TTS key')
    keyId = undefined

    console.log('TTS API test passed:', { label })
  } finally {
    if (keyId !== undefined) {
      const cleanup = await request(`/tts/keys/${keyId}`, { method: 'DELETE', token: adminToken })
      expectStatus(cleanup, 204, 'cleanup TTS key')
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1) })