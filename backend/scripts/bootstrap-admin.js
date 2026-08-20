const argon2 = require('argon2');
const { PrismaClient, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();

async function bootstrapAdmin() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const name = (process.env.BOOTSTRAP_ADMIN_NAME || 'System Administrator').trim();

  if (!email && !password) {
    console.log('Bootstrap admin is not configured; skipping.');
    return;
  }

  if (!email || !password) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be provided together.');
  }

  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Users already exist; bootstrap admin was not created.');
    return;
  }

  const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: UserRole.admin,
      isActive: true,
    },
  });

  console.log(`Initial administrator created for ${email}. Remove the bootstrap environment variables and redeploy.`);
}

bootstrapAdmin()
  .catch((error) => {
    console.error('Failed to create initial administrator:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
