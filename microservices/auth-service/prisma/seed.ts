import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const inversorPassword = await bcrypt.hash('inversor123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bonosverde.com' },
    update: {},
    create: {
      email: 'admin@bonosverde.com',
      name: 'Administrador',
      password_hash: adminPassword,
      role: 'ADMIN',
      curv_code: 'CURV-ADM1-0001',
      total_spent: 5000,
    },
  });

  const inversor = await prisma.user.upsert({
    where: { email: 'inversor@bonosverde.com' },
    update: {},
    create: {
      email: 'inversor@bonosverde.com',
      name: 'Carlos Inversor',
      password_hash: inversorPassword,
      role: 'INVESTOR',
      curv_code: 'CURV-INV1-0001',
      total_spent: 300,
    },
  });

  const inversorPremium = await prisma.user.upsert({
    where: { email: 'premium@bonosverde.com' },
    update: {},
    create: {
      email: 'premium@bonosverde.com',
      name: 'María Premium',
      password_hash: inversorPassword,
      role: 'PREMIUM',
      curv_code: 'CURV-PRM1-0001',
      total_spent: 1500,
    },
  });

  console.log('Users created:', { admin, inversor, inversorPremium });
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
