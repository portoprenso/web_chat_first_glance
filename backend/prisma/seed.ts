import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoUserCount = await prisma.user.count();

  if (demoUserCount > 0) {
    return;
  }

  await prisma.user.createMany({
    data: [
      {
        email: 'alice@example.com',
        displayName: 'Alice',
        passwordHash: '$2a$12$9q12d0w1Qy0zn4cSLdP13.Y6qBAmhpN6wXNjZspGDZCBoBPXaG9qW',
      },
      {
        email: 'bob@example.com',
        displayName: 'Bob',
        passwordHash: '$2a$12$9q12d0w1Qy0zn4cSLdP13.Y6qBAmhpN6wXNjZspGDZCBoBPXaG9qW',
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
