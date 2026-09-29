import 'dotenv/config'
import { randomUUID } from 'crypto'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const testId = randomUUID().slice(0, 8)
const username = `users_test_${testId}`
const email = `${username}@example.com`
const updatedEmail = `${username}.updated@example.com`
const currentPassword = 'UsersTest123!'
const newPassword = 'UsersTest456!'

interface ApiResponse {
  status: number
  body: Record<string, any>
}

async function request(
  path: string,
  options: { method: string; body?: unknown; token?: string },
): Promise<ApiResponse> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${apiBase}${path}`, {
    method: options.method,
    headers,
    body: options.body === undefined
      ? undefined
      : options.body instanceof FormData ? options.body : JSON.stringify(options.body),
  })
  const text = await response.text()

  let body: Record<string, any> = {}
  if (text) body = JSON.parse(text) as Record<string, any>

  return { status: response.status, body }
}

function expectStatus(result: ApiResponse, expected: number, label: string) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${result.status}: ${JSON.stringify(result.body)}`)
  }
}

function expectArray(result: ApiResponse, label: string) {
  if (!Array.isArray(result.body)) {
    throw new Error(`${label}: expected an array response`)
  }
}

async function main() {
  const health = await request('/../health', { method: 'GET' })
  expectStatus(health, 200, 'health')

  const unauthenticated = await request('/users/me', { method: 'GET' })
  expectStatus(unauthenticated, 401, 'unauthenticated profile')

  const registration = await request('/auth/register', {
    method: 'POST',
    body: { username, email, name: 'Users API Test', password: currentPassword },
  })
  expectStatus(registration, 201, 'register')
  const accessToken = registration.body.accessToken
  if (!accessToken) throw new Error('register: access token missing')

  const profile = await request('/users/me', { method: 'GET', token: accessToken })
  expectStatus(profile, 200, 'get profile')
  if (profile.body.username !== username || profile.body.email !== email) {
    throw new Error('get profile: returned user does not match the registered account')
  }

  const invalidAvatarUrl = await request('/users/me/avatar-from-url', {
    method: 'POST',
    token: accessToken,
    body: { url: 'not-a-url' },
  })
  expectStatus(invalidAvatarUrl, 422, 'invalid avatar URL')

  const validAvatarUrl = await request('/users/me/avatar-from-url', {
    method: 'POST',
    token: accessToken,
    body: { url: 'https://avatars.githubusercontent.com/u/69393345' },
  })
  expectStatus(validAvatarUrl, 200, 'valid avatar URL')

  const avatar = new FormData()
  avatar.append(
    'file',
    new Blob([
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAt8B9B2R3oAAAAAASUVORK5CYII=', 'base64'),
    ], { type: 'image/png' }),
    'avatar.png',
  )

  const uploadedAvatar = await request('/users/me/avatar', {
    method: 'POST',
    token: accessToken,
    body: avatar,
  })
  expectStatus(uploadedAvatar, 200, 'upload avatar')
  if (typeof uploadedAvatar.body.avatarUrl !== 'string' || uploadedAvatar.body.avatarUrl.length === 0) {
    throw new Error('upload avatar: response does not contain an avatar URL')
  }

  const updatedProfile = await request('/users/me', {
    method: 'PATCH',
    token: accessToken,
    body: { name: 'Updated Users Test', email: updatedEmail, bio: 'Users API smoke test' },
  })
  expectStatus(updatedProfile, 200, 'update profile')
  if (updatedProfile.body.email !== updatedEmail || updatedProfile.body.bio !== 'Users API smoke test') {
    throw new Error('update profile: response does not contain the updated values')
  }

  const settings = await request('/users/me/settings', {
    method: 'PUT',
    token: accessToken,
    body: { ttsSpeed: 1.25, autoNextChapter: true },
  })
  expectStatus(settings, 200, 'update settings')
  if (settings.body.ttsSpeed !== 1.25 || settings.body.autoNextChapter !== true) {
    throw new Error(`update settings: response does not contain the updated values: ${JSON.stringify(settings.body)}`)
  }

  const comments = await request('/users/me/comments', { method: 'GET', token: accessToken })
  expectStatus(comments, 200, 'get comments')
  expectArray(comments, 'get comments')

  const bookshelf = await request('/users/me/bookshelf', { method: 'GET', token: accessToken })
  expectStatus(bookshelf, 200, 'get bookshelf')
  expectArray(bookshelf, 'get bookshelf')

  const history = await request('/users/me/history', { method: 'GET', token: accessToken })
  expectStatus(history, 200, 'get history')
  expectArray(history, 'get history')

  const wrongPassword = await request('/users/me/password', {
    method: 'PATCH',
    token: accessToken,
    body: { currentPassword: 'wrong-password', newPassword },
  })
  expectStatus(wrongPassword, 401, 'wrong current password')

  const passwordChange = await request('/users/me/password', {
    method: 'PATCH',
    token: accessToken,
    body: { currentPassword, newPassword },
  })
  expectStatus(passwordChange, 200, 'change password')

  const newLogin = await request('/auth/login', {
    method: 'POST',
    body: { identifier: updatedEmail, password: newPassword },
  })
  expectStatus(newLogin, 200, 'login after password change')

  console.log('Users API test passed:', { username, email: updatedEmail })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})