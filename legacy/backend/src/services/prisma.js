let prismaInstance;
let prismaLoadError;

function getPrisma() {
  if (prismaInstance) return prismaInstance;
  if (prismaLoadError) throw prismaLoadError;

  try {
    const { PrismaClient } = require('@prisma/client');
    if (process.env.DATABASE_URL) {
      const { PrismaPg } = require('@prisma/adapter-pg');
      const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL
      });
      prismaInstance = new PrismaClient({ adapter });
      return prismaInstance;
    }

    prismaInstance = new PrismaClient();
    return prismaInstance;
  } catch (error) {
    prismaLoadError = error;
    throw error;
  }
}

function isPrismaReady() {
  try {
    getPrisma();
    return true;
  } catch (error) {
    return false;
  }
}

async function disconnectPrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

module.exports = {
  disconnectPrisma,
  getPrisma,
  isPrismaReady
};
