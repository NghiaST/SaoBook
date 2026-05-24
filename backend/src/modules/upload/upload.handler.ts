// src/modules/upload/upload.handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { config } from '../../config'
import { ValidationError } from '../../common/exceptions'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
})

async function putToR2(buffer: Buffer, mimeType: string, folder = 'images'): Promise<string> {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const key = `${folder}/${randomUUID()}.${ext}`

  await s3.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }))

  return `${config.r2.publicUrl}/${key}`
}

// ── Upload file ───────────────────────────────────────────────────────────────

export async function uploadImage(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { file?: any }
  let file = body?.file

  // fallback for non-attachFieldsToBody mode
  if (!file && typeof (request as any).file === 'function') {
    file = await (request as any).file()
  }

  if (!file) throw new ValidationError('No file provided')

  const mimeType: string = file.mimetype ?? file.type ?? ''
  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new ValidationError(`File must be an image (${ALLOWED_MIME.join(', ')})`)
  }

  const buffer: Buffer = typeof file.toBuffer === 'function'
    ? await file.toBuffer()
    : Buffer.from(file.data ?? file._buf ?? '')

  if (buffer.length > MAX_BYTES) {
    throw new ValidationError('Image must be 10 MB or smaller')
  }

  const url = await putToR2(buffer, mimeType, 'images')
  return reply.send({ url })
}

// ── Upload from URL ───────────────────────────────────────────────────────────

export async function uploadImageFromUrl(request: FastifyRequest, reply: FastifyReply) {
  const { url } = request.body as { url?: string }

  if (!url || !/^https?:\/\//i.test(url)) {
    throw new ValidationError('A valid http/https URL is required')
  }

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch {
    throw new ValidationError('Could not reach the URL')
  }

  if (!response.ok) throw new ValidationError('URL returned a non-200 response')

  const mimeType = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new ValidationError('URL does not point to a supported image type')
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length > MAX_BYTES) {
    throw new ValidationError('Image at URL is larger than 10 MB')
  }

  const r2Url = await putToR2(buffer, mimeType, 'images')
  return reply.send({ url: r2Url })
}
