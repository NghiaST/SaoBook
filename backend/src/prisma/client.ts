// src/prisma/client.ts
import { PrismaClient } from '@prisma/client'
import { config } from '../config'

const prisma = new PrismaClient({
  log: config.isDev ? ['query', 'warn', 'error'] : ['error'],
})

export default prisma