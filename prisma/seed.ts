import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const predefinedTags = [
    'Action',
    'Adventure',
    'Animation',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Fantasy',
    'Horror',
    'Mystery',
    'Romance',
    'Science Fiction',
    'Thriller',
    'Western',
    'Biography',
    'Musical',
    'War',
    'Historical',
    'Family',
    'Noir'
  ];

  console.log('Seeding predefined tags...');

  for (const tagName of predefinedTags) {
    await prisma.predefinedTag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
  }

  console.log(`Seeded ${predefinedTags.length} predefined tags`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
