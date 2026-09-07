import { PrismaClient } from "@prisma/client";
import { GENRES } from "../src/lib/genres";

const prisma = new PrismaClient();

// Seed the genre taxonomy. Parents are created before children so parentId
// links resolve. Idempotent: re-running only fills gaps.
async function main() {
  // First pass: create every genre without parent links.
  for (const g of GENRES) {
    await prisma.genre.upsert({
      where: { slug: g.slug },
      create: { slug: g.slug, name: g.name },
      update: { name: g.name },
    });
  }

  // Second pass: wire up parents.
  for (const g of GENRES) {
    if (!g.parent) continue;
    const parent = await prisma.genre.findUnique({ where: { slug: g.parent } });
    if (!parent) continue;
    await prisma.genre.update({
      where: { slug: g.slug },
      data: { parentId: parent.id },
    });
  }

  const count = await prisma.genre.count();
  console.log(`✓ seeded ${count} genres`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
