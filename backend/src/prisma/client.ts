// src/prisma/client.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from '../config'

const adapter = new PrismaPg({ connectionString: config.db.url })

const prisma = new PrismaClient({
  adapter,
  log: config.isDev ? ['query', 'warn', 'error'] : ['error'],
})

export default prisma