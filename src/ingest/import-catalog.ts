import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db";

interface CatalogPayload {
  artists: {
    mbid: string | null;
    name: string;
    sortName: string | null;
    country: string | null;
    aliases: string | null;
    genres: { slug: string; confidence: number }[];
  }[];
}

async function main() {
  const file = argValue("file");
  if (!file) throw new Error("Pass --file=/path/to/catalog.json");

  const payload = JSON.parse(await readFile(file, "utf8")) as CatalogPayload;
  let imported = 0;
  let linkedGenres = 0;

  for (const item of payload.artists) {
    const artist = item.mbid
      ? await prisma.artist.upsert({
          where: { mbid: item.mbid },
          create: {
            mbid: item.mbid,
            name: item.name,
            sortName: item.sortName,
            country: item.country,
            aliases: item.aliases,
          },
          update: {
            name: item.name,
            sortName: item.sortName,
            country: item.country,
            aliases: item.aliases,
          },
        })
      : await upsertByName(item);

    imported++;

    for (const link of item.genres) {
      const genre = await prisma.genre.findUnique({ where: { slug: link.slug } });
      if (!genre) continue;

      await prisma.artistGenre.upsert({
        where: { artistId_genreId: { artistId: artist.id, genreId: genre.id } },
        create: {
          artistId: artist.id,
          genreId: genre.id,
          confidence: link.confidence,
        },
        update: { confidence: link.confidence },
      });
      linkedGenres++;
    }

    if (imported % 250 === 0) console.log(`  ...${imported}/${payload.artists.length}`);
  }

  console.log(`✓ done. ${imported} artists upserted, ${linkedGenres} genre links upserted.`);
}

async function upsertByName(item: CatalogPayload["artists"][number]) {
  const existing = await prisma.artist.findFirst({ where: { name: item.name } });
  if (existing) {
    return prisma.artist.update({
      where: { id: existing.id },
      data: {
        sortName: item.sortName,
        country: item.country,
        aliases: item.aliases,
      },
    });
  }

  return prisma.artist.create({
    data: {
      name: item.name,
      sortName: item.sortName,
      country: item.country,
      aliases: item.aliases,
    },
  });
}

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
