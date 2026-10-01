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
  return { token: result.body.accessToken as string, userId: result.body.user.id as string }
}

async function main() {
  const adminAuth = await login(adminUsername, adminPassword, 'admin')
  const userAuth = await login(username, password, 'user')
  const adminToken = adminAuth.token
  const userToken = userAuth.token
  const testId = randomUUID().slice(0, 8)
  const label = `TTS API Test ${testId}`
  const key = `tts-test-key-${testId}`
  const secret = `tts-test-secret-${testId}`
  const userKey = `tts-user-key-${testId}`
  const userSecret = `tts-user-secret-${testId}`
  let keyId: string | undefined
  let userKeyId: string | undefined

  try {
    const unauthenticated = await request('/tts/keys/active', { method: 'GET' })
    expectStatus(unauthenticated, 401, 'unauthenticated active keys')

    const unauthenticatedVoices = await request('/tts/voices', { method: 'GET' })
    expectStatus(unauthenticatedVoices, 401, 'unauthenticated voice list')

    const unauthenticatedAudio = await request('/tts/audio', {
      method: 'POST', body: { text: 'authentication test' },
    })
    expectStatus(unauthenticatedAudio, 401, 'unauthenticated audio')

    const created = await request('/tts/keys', {
      method: 'POST', token: adminToken, body: { label, key, secret },
    })
    expectStatus(created, 201, 'create TTS key')
    keyId = created.body.id
    if (!keyId) throw new Error('create TTS key: id missing')
    if (created.body.label !== label || created.body.key !== undefined || created.body.secret !== undefined || created.body.status !== 'public') {
      throw new Error('create TTS key: response does not match the created key')
    }

    const duplicate = await request('/tts/keys', {
      method: 'POST', token: adminToken, body: { label: `${label} Duplicate`, key },
    })
    expectStatus(duplicate, 409, 'create duplicate TTS key')
    if (duplicate.body.error !== 'CONFLICT') {
      throw new Error('create duplicate TTS key: expected CONFLICT response')
    }

    const listed = await request('/tts/keys', { method: 'GET', token: adminToken })
    expectStatus(listed, 200, 'list TTS keys')
    if (!Array.isArray(listed.body) || !listed.body.some((item: any) => item.id === keyId)) {
      throw new Error('list TTS keys: created key was not found')
    }
    if (listed.body.some((item: any) => 'key' in item || 'secret' in item)) {
      throw new Error('list TTS keys: credentials were returned')
    }

    const publicCredentials = await request(`/tts/keys/${keyId}/credentials`, {
      method: 'GET', token: adminToken,
    })
    expectStatus(publicCredentials, 200, 'get public TTS key credentials as admin')
    if (publicCredentials.body.key !== key || publicCredentials.body.secret !== secret) {
      throw new Error('get public TTS key credentials as admin: credentials did not match')
    }

    const userPublicCredentials = await request(`/tts/keys/${keyId}/credentials`, {
      method: 'GET', token: userToken,
    })
    expectStatus(userPublicCredentials, 403, 'get public TTS key credentials as user')

    const createdUserKey = await request('/tts/keys', {
      method: 'POST', token: userToken,
      body: { label: `${label} User`, key: userKey, secret: userSecret },
    })
    expectStatus(createdUserKey, 201, 'create user TTS key')
    userKeyId = createdUserKey.body.id
    if (!userKeyId || createdUserKey.body.userSettingsId === null || createdUserKey.body.status !== 'personal') {
      throw new Error('create user TTS key: ownership was not returned')
    }
    if (createdUserKey.body.key !== undefined || createdUserKey.body.secret !== undefined) {
      throw new Error('create user TTS key: credentials were returned')
    }

    const userCredentials = await request(`/tts/keys/${userKeyId}/credentials`, {
      method: 'GET', token: userToken,
    })
    expectStatus(userCredentials, 200, 'get personal TTS key credentials')
    if (userCredentials.body.key !== userKey || userCredentials.body.secret !== userSecret) {
      throw new Error('get personal TTS key credentials: credentials did not match')
    }

    const adminUserCredentials = await request(`/tts/keys/${userKeyId}/credentials`, {
      method: 'GET', token: adminToken,
    })
    expectStatus(adminUserCredentials, 200, 'get personal TTS key credentials as admin')

    const unauthorizedSelection = await request('/users/me/settings', {
      method: 'PUT', token: adminToken, body: { selectedRvApiKeyId: userKeyId },
    })
    expectStatus(unauthorizedSelection, 422, 'select another user\'s TTS key')

    const selected = await request('/users/me/settings', {
      method: 'PUT', token: userToken, body: { selectedRvApiKeyId: userKeyId },
    })
    expectStatus(selected, 200, 'select personal TTS key')
    if (selected.body.selectedRvApiKeyId !== userKeyId) {
      throw new Error('select personal TTS key: selected key was not persisted')
    }
    if (!selected.body.rvSettings?.voiceName || !selected.body.rvSettings?.language || !selected.body.rvSettings?.gender) {
      throw new Error('select personal TTS key: rvSettings were not returned')
    }

    const hiddenSelected = await request(`/tts/keys/${userKeyId}`, {
      method: 'PATCH', token: userToken, body: { status: 'hidden' },
    })
    expectStatus(hiddenSelected, 200, 'hide selected TTS key')

    const audioWithHiddenSelection = await request('/tts/audio', {
      method: 'POST', token: userToken, body: { text: 'hidden selection test' },
    })
    expectStatus(audioWithHiddenSelection, 422, 'audio with hidden selected key')

    const restoredSelected = await request(`/tts/keys/${userKeyId}`, {
      method: 'PATCH', token: userToken, body: { status: 'personal' },
    })
    expectStatus(restoredSelected, 200, 'restore selected TTS key')

    const updated = await request(`/tts/keys/${keyId}`, {
      method: 'PATCH', token: adminToken, body: { label: `${label} Updated`, status: 'hidden' },
    })
    expectStatus(updated, 200, 'update TTS key')
    if (updated.body.label !== `${label} Updated` || updated.body.status !== 'hidden' || updated.body.key !== undefined || updated.body.secret !== undefined) {
      throw new Error('update TTS key: values were not updated')
    }

    const activeAfterDisable = await request('/tts/keys/active', { method: 'GET', token: userToken })
    expectStatus(activeAfterDisable, 200, 'list active TTS keys after disable')
    if (!Array.isArray(activeAfterDisable.body.keys) || activeAfterDisable.body.keys.includes(key)) {
      throw new Error('list active TTS keys: disabled global key was returned')
    }
    if (!activeAfterDisable.body.keys.includes(userKey)) {
      throw new Error('list active TTS keys: owned active key was not returned')
    }

    const enabled = await request(`/tts/keys/${keyId}`, {
      method: 'PATCH', token: adminToken, body: { status: 'public' },
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

    const deletedUserKey = await request(`/tts/keys/${userKeyId}`, { method: 'DELETE', token: userToken })
    expectStatus(deletedUserKey, 204, 'delete user TTS key')
    userKeyId = undefined

    console.log('TTS API test passed:', { label })
  } finally {
    if (keyId !== undefined) {
      const cleanup = await request(`/tts/keys/${keyId}`, { method: 'DELETE', token: adminToken })
      expectStatus(cleanup, 204, 'cleanup TTS key')
    }
    if (userKeyId !== undefined) {
      const cleanup = await request(`/tts/keys/${userKeyId}`, { method: 'DELETE', token: userToken })
      expectStatus(cleanup, 204, 'cleanup user TTS key')
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1) })