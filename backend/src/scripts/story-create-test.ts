import 'dotenv/config'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const username = process.env.ADMIN_USERNAME ?? ''
const password = process.env.ADMIN_PASSWORD ?? ''
const r2PublicUrl = process.env.R2_PUBLIC_URL ?? ''

if (!username || !password) {
  console.error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in env')
  process.exit(1)
}

const posterPath = process.env.POSTER_PATH
  ?? path.resolve(__dirname, '..', '..', '..', 'poster.jpg')

if (!fs.existsSync(posterPath)) {
  console.error(`Poster file not found: ${posterPath}`)
  process.exit(1)
}

const posterBuffer = fs.readFileSync(posterPath)
const posterName = path.basename(posterPath)
const ext = path.extname(posterName).toLowerCase()
const posterMime = ext === '.png'
  ? 'image/png'
  : ext === '.webp'
    ? 'image/webp'
    : ext === '.gif'
      ? 'image/gif'
      : ext === '.avif'
        ? 'image/avif'
        : 'image/jpeg'

async function main() {
  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password }),
  })

  if (!loginRes.ok) {
    const text = await loginRes.text()
    throw new Error(`Login failed (${loginRes.status}): ${text}`)
  }

  const loginJson = await loginRes.json() as { accessToken: string }

  const id = randomUUID().slice(0, 8)
  const storyName = `Story Test ${id}`
  const storySlug = `story-test-${id}`

  const form = new FormData()
  form.append('name', storyName)
  form.append('nameId', storySlug)
  form.append('description', 'Story create smoke test')
  form.append('sourceNote', 'script')
  if (typeof File !== 'undefined') {
    const file = new File([posterBuffer], posterName, { type: posterMime })
    form.append('posterFile', file)
  } else {
    const blob = new Blob([posterBuffer], { type: posterMime })
    form.append('posterFile', blob, posterName)
  }

  const createRes = await fetch(`${apiBase}/stories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginJson.accessToken}` },
    body: form,
  })

  const createText = await createRes.text()
  let createJson: any = null
  try {
    createJson = JSON.parse(createText)
  } catch {
    // ignore
  }

  if (!createRes.ok) {
    throw new Error(`Create story failed (${createRes.status}): ${createText}`)
  }

  if (!createJson?.id || !createJson?.nameId || !createJson?.posterUrl) {
    throw new Error(`Invalid response payload: ${createText}`)
  }

  if (r2PublicUrl && !createJson.posterUrl.startsWith(r2PublicUrl)) {
    throw new Error(`posterUrl does not use R2_PUBLIC_URL: ${createJson.posterUrl}`)
  }

  const detailRes = await fetch(`${apiBase}/stories/${createJson.nameId}`)
  if (!detailRes.ok) {
    const text = await detailRes.text()
    throw new Error(`Fetch story failed (${detailRes.status}): ${text}`)
  }

  const detailJson = await detailRes.json() as { id: string; posterUrl?: string }
  if (detailJson.id !== createJson.id) {
    throw new Error('Story ID mismatch after creation')
  }

  if (!detailJson.posterUrl) {
    throw new Error('posterUrl missing in story detail')
  }

  console.log('Story create test passed:', {
    id: createJson.id,
    nameId: createJson.nameId,
    posterUrl: createJson.posterUrl,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
