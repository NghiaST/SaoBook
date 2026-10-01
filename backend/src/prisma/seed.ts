// src/prisma/seed.ts
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from './client'

const roles = ['admin', 'author', 'user'] as const

type SeedUser = {
  username: string
  email: string
  password: string
  name: string
  role: (typeof roles)[number]
}

function readSeedUsers(): SeedUser[] {
  const seedUsers: SeedUser[] = [
    {
      username: process.env.ADMIN_USERNAME ?? '',
      email: process.env.ADMIN_EMAIL ?? '',
      password: process.env.ADMIN_PASSWORD ?? '',
      name: process.env.ADMIN_NAME ?? 'Admin',
      role: 'admin',
    },
    {
      username: process.env.AUTHOR_USERNAME ?? '',
      email: process.env.AUTHOR_EMAIL ?? '',
      password: process.env.AUTHOR_PASSWORD ?? '',
      name: process.env.AUTHOR_NAME ?? 'Author',
      role: 'author',
    },
    {
      username: process.env.USER_USERNAME ?? '',
      email: process.env.USER_EMAIL ?? '',
      password: process.env.USER_PASSWORD ?? '',
      name: process.env.USER_NAME ?? 'User',
      role: 'user',
    },
  ]

  const missing = seedUsers
    .filter((user) => !user.username || !user.email || !user.password)
    .map((user) => `${user.role.toUpperCase()}_USERNAME/EMAIL/PASSWORD`)

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars for seeded users: ${missing.join(', ')}`,
    )
  }

  return seedUsers
}

async function main() {
  const seedUsers = readSeedUsers()

  for (const userConfig of seedUsers) {
    const { username, email, password, name, role } = userConfig
    const passwordHash = await bcrypt.hash(password, 12)

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { username, email, name, passwordHash, role },
          select: { id: true, username: true, email: true, role: true },
        })
      : await prisma.user.create({
          data: {
            username,
            email,
            name,
            passwordHash,
            role,
          },
          select: { id: true, username: true, email: true, role: true },
        })

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })

    console.log(`${role} user ready:`, user)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
