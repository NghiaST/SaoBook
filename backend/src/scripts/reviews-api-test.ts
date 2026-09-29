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
  form.append('name', `Reviews API Test ${testId}`)
  form.append('nameId', `reviews-api-test-${testId}`)
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

    const review = await request(`/stories/${storyId}/reviews`, {
      method: 'PUT', token: userToken, body: { rating: 4, content: `Review ${testId}` },
    })
    expectStatus(review, 200, 'create review')
    if (review.body.rating !== 4 || review.body.content !== `Review ${testId}`) throw new Error('create review: response is invalid')

    const updated = await request(`/stories/${storyId}/reviews`, {
      method: 'PUT', token: userToken, body: { rating: 5, content: `Updated review ${testId}` },
    })
    expectStatus(updated, 200, 'update review')
    if (updated.body.rating !== 5 || updated.body.content !== `Updated review ${testId}`) throw new Error('update review: values were not updated')

    const reviews = await request(`/stories/${storyId}/reviews`, { method: 'GET' })
    expectStatus(reviews, 200, 'list reviews')
    if (!Array.isArray(reviews.body) || reviews.body.length !== 1 || reviews.body[0].rating !== 5) throw new Error('list reviews: expected the updated review')

    const deleted = await request(`/stories/${storyId}/reviews`, { method: 'DELETE', token: userToken })
    expectStatus(deleted, 204, 'delete review')
    console.log('Reviews API test passed:', { storyId })
  } finally {
    if (storyId !== undefined) {
      const deletedStory = await request(`/stories/${storyId}`, { method: 'DELETE', token: authorToken })
      expectStatus(deletedStory, 204, 'cleanup story')
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1) })