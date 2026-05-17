// src/config/index.ts

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000')),
  host: optional('HOST', '0.0.0.0'),

  db: {
    url: required('DATABASE_URL'),
    directUrl: required('DIRECT_URL'),
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '30d'),
  },

  r2: {
    accountId: required('R2_ACCOUNT_ID'),
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    bucketName: required('R2_BUCKET_NAME'),
    publicUrl: required('R2_PUBLIC_URL'),
  },

  resend: {
    apiKey: required('RESEND_API_KEY'),
    from: optional('RESEND_EMAIL_FROM', 'SaoBook'),
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:5173'),
  },

  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV !== 'production',
}