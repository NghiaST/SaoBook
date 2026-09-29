import 'dotenv/config'
import { randomUUID } from 'crypto'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const authorUsername = process.env.AUTHOR_USERNAME ?? ''
const authorPassword = process.env.AUTHOR_PASSWORD ?? ''
const username = process.env.USER_USERNAME ?? ''
const password = process.env.USER_PASSWORD ?? ''

if (!authorUsername || !authorPassword || !username || !password) {
  console.error('Missing AUTHOR_USERNAME, AUTHOR_PASSWORD, USER_USERNAME, or USER_PASSWORD in env')
  process.exit(1)
}

interface ApiResponse { status: number; body: any }

async function request(path: string, options: { method: string; body?: unknown; token?: string }): Promise<ApiResponse> {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method,
    headers: {
      ...(options.body === undefined || options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined
      ? undefined
      : options.body instanceof FormData ? options.body : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

function expectStatus(result: ApiResponse, expected: number, label: string) {
  if (result.status !== expected) throw new Error(`${label}: expected ${expected}, received ${result.status}: ${JSON.stringify(result.body)}`)
}

async function login(identifier: string, loginPassword: string, label: string) {
  const result = await request('/auth/login', { method: 'POST', body: { identifier, password: loginPassword } })
  expectStatus(result, 200, `${label} login`)
  if (!result.body.accessToken) throw new Error(`${label} login: access token missing`)
  return result.body.accessToken as string
}

function storyForm(testId: string) {
  const form = new FormData()
  form.append('name', `Bookshelf API Test ${testId}`)
  form.append('nameId', `bookshelf-api-test-${testId}`)
  form.append('posterFile', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAt8B9B2R3oAAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'test.png')
  return form
}

async function main() {
  const authorToken = await login(authorUsername, authorPassword, 'author')
  const userToken = await login(username, password, 'user')
  const testId = randomUUID().slice(0, 8)
  let storyId: number | undefined

  try {
    const createdStory = await request('/stories', {
      method: 'POST', token: authorToken,
      body: storyForm(testId),
    })
    expectStatus(createdStory, 201, 'create story')
    storyId = createdStory.body.id
    if (!storyId) throw new Error('create story: id missing')

    const initialBookshelf = await request('/users/me/bookshelf', { method: 'GET', token: userToken })
    expectStatus(initialBookshelf, 200, 'list initial bookshelf')
    if (!Array.isArray(initialBookshelf.body)) throw new Error('list initial bookshelf: expected an array')
    const initialCount = initialBookshelf.body.length

    const saved = await request(`/bookshelf/${storyId}`, {
      method: 'PUT', token: userToken, body: { note: `Saved ${testId}` },
    })
    expectStatus(saved, 200, 'save story')

    const updated = await request(`/bookshelf/${storyId}`, {
      method: 'PATCH', token: userToken, body: { note: `Updated ${testId}` },
    })
    expectStatus(updated, 200, 'update bookshelf note')

    const bookshelf = await request('/users/me/bookshelf', { method: 'GET', token: userToken })
    expectStatus(bookshelf, 200, 'list bookshelf')
    if (!Array.isArray(bookshelf.body) || bookshelf.body.length !== initialCount + 1) throw new Error('list bookshelf: saved story was not added')

    const removed = await request(`/bookshelf/${storyId}`, { method: 'DELETE', token: userToken })
    expectStatus(removed, 204, 'remove story')
    console.log('Bookshelf API test passed:', { storyId })
  } finally {
    if (storyId !== undefined) {
      const deletedStory = await request(`/stories/${storyId}`, { method: 'DELETE', token: authorToken })
      expectStatus(deletedStory, 204, 'cleanup story')
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1) })