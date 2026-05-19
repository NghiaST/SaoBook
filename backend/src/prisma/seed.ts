import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from './client'

async function main() {
  const username = process.env.ADMIN_USERNAME
  const email = process.env.ADMIN_EMAIL
  const name = process.env.ADMIN_NAME ?? 'Admin'
  const password = process.env.ADMIN_PASSWORD

  if (!username || !email || !password) {
    console.error('Missing ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD in env')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  })

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { username, email, name, passwordHash, role: 'admin' },
        select: { id: true, username: true, email: true, role: true },
      })
    : await prisma.user.create({
        data: {
          username,
          email,
          name,
          passwordHash,
          role: 'admin',
          settings: { create: {} },
        },
        select: { id: true, username: true, email: true, role: true },
      })

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })

  console.log('Admin user ready:', user)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
