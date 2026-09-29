import 'dotenv/config'
import { randomUUID } from 'crypto'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const username = process.env.AUTHOR_USERNAME ?? ''
const password = process.env.AUTHOR_PASSWORD ?? ''

if (!username || !password) {
  console.error('Missing AUTHOR_USERNAME or AUTHOR_PASSWORD in env')
  process.exit(1)
}

interface ApiResponse {
  status: number
  body: any
}

async function request(
  path: string,
  options: { method: string; body?: unknown; token?: string },
): Promise<ApiResponse> {
  const headers: Record<string, string> = {}
  if (options.body instanceof FormData === false && options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${apiBase}${path}`, {
    method: options.method,
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()

  let body: any = null
  if (text) body = JSON.parse(text)

  return { status: response.status, body }
}

function expectStatus(result: ApiResponse, expected: number, label: string) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${result.status}: ${JSON.stringify(result.body)}`)
  }
}

function expectValue(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${label}: value is missing`)
  }
}

async function main() {
  const login = await request('/auth/login', {
    method: 'POST',
    body: { identifier: username, password },
  })
  expectStatus(login, 200, 'author login')
  const accessToken = login.body.accessToken
  expectValue(accessToken, 'author access token')

  const testId = randomUUID().slice(0, 8)
  const storySlug = `api-test-${testId}`
  const storyName = `API Test Story ${testId}`
  let storyId: number | undefined
  const chapterIds: number[] = []

  try {
    const poster = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAt8B9B2R3oAAAAAASUVORK5CYII=',
      'base64',
    )
    const form = new FormData()
    form.append('name', storyName)
    form.append('nameId', storySlug)
    form.append('description', 'Stories and chapters API smoke test')
    form.append('sourceNote', 'automated test')
    form.append('posterFile', new Blob([poster], { type: 'image/png' }), 'test.png')

    const createdStory = await request('/stories', {
      method: 'POST',
      token: accessToken,
      body: form,
    })
    expectStatus(createdStory, 201, 'create story')
    expectValue(createdStory.body.id, 'created story id')
    expectValue(createdStory.body.posterUrl, 'created story posterUrl')
    storyId = createdStory.body.id

    const stories = await request(`/stories?q=${encodeURIComponent(storyName)}`, { method: 'GET' })
    expectStatus(stories, 200, 'list stories')
    if (!stories.body.stories.some((story: any) => story.nameId === storySlug)) {
      throw new Error('list stories: created story was not found')
    }

    const story = await request(`/stories/${storySlug}`, { method: 'GET' })
    expectStatus(story, 200, 'get story')
    if (story.body.id !== storyId || story.body.nameId !== storySlug) {
      throw new Error('get story: response does not match the created story')
    }

    const updatedStory = await request(`/stories/${storyId}`, {
      method: 'PATCH',
      token: accessToken,
      body: { description: 'Updated stories and chapters API test' },
    })
    expectStatus(updatedStory, 200, 'update story')
    if (updatedStory.body.description !== 'Updated stories and chapters API test') {
      throw new Error('update story: description was not updated')
    }

    const createdChapter = await request(`/stories/${storyId}/chapters`, {
      method: 'POST',
      token: accessToken,
      body: { name: 'Chapter One', content: 'Chapter one content', order: 1 },
    })
    expectStatus(createdChapter, 201, 'create chapter')
    expectValue(createdChapter.body.id, 'created chapter id')
    expectValue(createdChapter.body.contentUrl, 'created chapter contentUrl')
    chapterIds.push(createdChapter.body.id)

    const batch = await request(`/stories/${storyId}/chapters/batch`, {
      method: 'POST',
      token: accessToken,
      body: [
        { name: 'Chapter Two', content: 'Chapter two content' },
        { name: 'Chapter Three', content: 'Chapter three content' },
      ],
    })
    expectStatus(batch, 201, 'create chapters batch')
    if (!Array.isArray(batch.body) || batch.body.length !== 2) {
      throw new Error('create chapters batch: expected two chapters')
    }
    chapterIds.push(...batch.body.map((chapter: any) => chapter.id))

    const chapters = await request(`/stories/${storySlug}/chapters`, { method: 'GET' })
    expectStatus(chapters, 200, 'list chapters')
    if (chapters.body.length !== 3 || chapters.body[0].order !== 1) {
      throw new Error('list chapters: expected three ordered chapters')
    }

    const chapter = await request(`/chapters/${chapterIds[0]}`, { method: 'GET' })
    expectStatus(chapter, 200, 'get chapter')
    if (chapter.body.id !== chapterIds[0] || chapter.body.storyId !== storyId) {
      throw new Error('get chapter: response does not match the created chapter')
    }

    const updatedChapter = await request(`/chapters/${chapterIds[0]}`, {
      method: 'PATCH',
      token: accessToken,
      body: { name: 'Updated Chapter One', order: 1 },
    })
    expectStatus(updatedChapter, 200, 'update chapter')
    if (updatedChapter.body.name !== 'Updated Chapter One') {
      throw new Error('update chapter: name was not updated')
    }

    const markedRead = await request(`/chapters/${chapterIds[0]}/read`, {
      method: 'POST',
      token: accessToken,
    })
    expectStatus(markedRead, 200, 'mark chapter read')
    if (markedRead.body.ok !== true) throw new Error('mark chapter read: expected ok=true')

    console.log('Stories and chapters API test passed:', { storyId, storySlug, chapterIds })
  } finally {
    if (storyId !== undefined) {
      const deletedStory = await request(`/stories/${storyId}`, {
        method: 'DELETE',
        token: accessToken,
      })
      expectStatus(deletedStory, 204, 'cleanup story')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})