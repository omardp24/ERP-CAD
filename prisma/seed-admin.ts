// prisma/seed-admin.ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Datos del admin
  const email = 'admin@cad.com';
  const plainPassword = 'Admin123!'; // la clave con la que vas a entrar
  const name = 'Admin CAD';

  // Hasheamos igual que en AuthService
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // OJO: modelo User  -> prisma.user (minúscula)
  const admin = await prisma.user.upsert({
    where: { email }, // email debe ser @unique (y lo es)
    update: {},       // si ya existe, no lo toca
    create: {
      email,
      password: passwordHash, // tu campo se llama "password"
      name,
      role: UserRole.ADMIN,   // enum que ya tienes definido
    },
  });

  console.log('✅ Admin creado/actualizado:');
  console.log({ id: admin.id, email: admin.email, role: admin.role });
}

main()
  .catch((e) => {
    console.error('❌ Error creando admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
