import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const lines = content.split(/\r?\n/)
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const backendEnvPath = path.resolve(__dirname, '..', '..', 'backend', '.env')
const backendEnv = loadEnvFile(backendEnvPath)

const apiBase = process.env.API_BASE_URL || backendEnv.API_BASE_URL || process.env.VITE_API_URL || backendEnv.VITE_API_URL || 'http://localhost:3000/api'
const username = process.env.ADMIN_USERNAME || backendEnv.ADMIN_USERNAME || ''
const password = process.env.ADMIN_PASSWORD || backendEnv.ADMIN_PASSWORD || ''
const r2PublicUrl = process.env.R2_PUBLIC_URL || backendEnv.R2_PUBLIC_URL || ''

if (!username || !password) {
  console.error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in env')
  process.exit(1)
}

const posterPath = process.env.POSTER_PATH
  || path.resolve(__dirname, '..', '..', 'poster.jpg')

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

  const loginJson = await loginRes.json()

  const id = randomUUID().slice(0, 8)
  const storyName = `Frontend Test ${id}`
  const storySlug = `frontend-test-${id}`

  const form = new FormData()
  form.append('name', storyName)
  form.append('nameId', storySlug)
  form.append('description', 'Frontend create story test')
  form.append('sourceNote', 'frontend script')
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
  let createJson = null
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

  const detailJson = await detailRes.json()
  if (detailJson.id !== createJson.id) {
    throw new Error('Story ID mismatch after creation')
  }

  if (!detailJson.posterUrl) {
    throw new Error('posterUrl missing in story detail')
  }

  console.log('Frontend create story test passed:', {
    id: createJson.id,
    nameId: createJson.nameId,
    posterUrl: createJson.posterUrl,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
