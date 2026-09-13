const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { getPrisma, disconnectPrisma } = require('../src/services/prisma');
const { hashPassword } = require('../src/utils/crypto');

async function main() {
  const prisma = getPrisma();
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('Seed admin dilewati. Set SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD jika perlu membuat admin awal.');
    return;
  }

  if (adminPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD minimal 12 karakter.');
  }

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {},
    create: {
      email: adminEmail.toLowerCase(),
      name: 'Marketplace Admin',
      passwordHash: hashPassword(adminPassword),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date()
    }
  });

  console.log(`Admin seed siap: ${adminEmail.toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
