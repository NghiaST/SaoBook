import 'dotenv/config'
import { randomUUID } from 'crypto'

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api'
const username = process.env.ADMIN_USERNAME ?? ''
const password = process.env.ADMIN_PASSWORD ?? ''

if (!username || !password) {
  console.error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in env')
  process.exit(1)
}

const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAt8B9B2R3oAAAAAASUVORK5CYII='
const pngBuffer = Buffer.from(pngBase64, 'base64')

const id = randomUUID().slice(0, 8)
const storyName = `Poster Smoke ${id}`
const storySlug = `poster-smoke-${id}`

const form = new FormData()
form.append('name', storyName)
form.append('nameId', storySlug)
form.append('description', 'Smoke test upload')

if (typeof File !== 'undefined') {
  const file = new File([pngBuffer], 'poster.png', { type: 'image/png' })
  form.append('posterFile', file)
} else {
  const blob = new Blob([pngBuffer], { type: 'image/png' })
  form.append('posterFile', blob, 'poster.png')
}

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

  if (!createJson?.posterUrl) {
    throw new Error(`posterUrl is empty in response: ${createText}`)
  }

  console.log('Created story with posterUrl:', createJson.posterUrl)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
