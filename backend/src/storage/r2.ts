// src/storage/r2.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config'
import { randomUUID } from 'crypto'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
})

/**
 * Upload chapter content (plain text or HTML) to R2.
 * Returns the public URL.
 */
export async function uploadChapterContent(
  content: string,
  storyId: string,
  chapterId?: string,
): Promise<string> {
  const id = chapterId ?? randomUUID()
  const key = `chapters/${storyId}/${id}.txt`

  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: content,
      ContentType: 'text/plain; charset=utf-8',
    }),
  )

  return `${config.r2.publicUrl}/${key}`
}

/**
 * Upload a story poster image to R2.
 * Returns the public URL.
 */
export async function uploadPoster(
  buffer: Buffer,
  mimeType: string,
  storyId: string,
): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg'
  const key = `posters/${storyId}.${ext}`

  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  )

  return `${config.r2.publicUrl}/${key}`
}

/**
 * Upload a user avatar to R2.
 */
export async function uploadAvatar(
  buffer: Buffer,
  mimeType: string,
  userId: string,
): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg'
  const key = `avatars/${userId}.${ext}`

  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  )

  return `${config.r2.publicUrl}/${key}`
}

/**
 * Delete a file from R2 by its full public URL or key.
 */
export async function deleteFile(urlOrKey: string): Promise<void> {
  const key = urlOrKey.startsWith('http')
    ? urlOrKey.replace(`${config.r2.publicUrl}/`, '')
    : urlOrKey

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
    }),
  )
}

/**
 * Generate a temporary signed URL (for private buckets).
 */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.r2.bucketName, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}