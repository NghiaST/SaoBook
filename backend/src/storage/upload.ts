import { randomUUID } from 'crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { config } from '../config'
import { ValidationError } from '../common/exceptions'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_BYTES = 10 * 1024 * 1024

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
})

export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  folder = 'images',
): Promise<string> {
  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new ValidationError(`File must be an image (${ALLOWED_MIME.join(', ')})`)
  }

  if (buffer.length > MAX_BYTES) {
    throw new ValidationError('Image must be 10 MB or smaller')
  }

  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const key = `${folder}/${randomUUID()}.${extension}`

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }))

  return `${config.r2.publicUrl}/${key}`
}

export async function uploadImageFromUrl(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
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
  const buffer = Buffer.from(await response.arrayBuffer())

  return uploadImage(buffer, mimeType)
}
