import { prisma } from "@/lib/db";

async function main() {
  const countries = parseList(argValue("countries"));
  const where = countries.length
    ? { country: { in: countries.map((country) => country.toUpperCase()) } }
    : {};

  const artists = await prisma.artist.findMany({
    where,
    include: {
      artistGenres: {
        include: { genre: { select: { slug: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    artists: artists.map((artist) => ({
      mbid: artist.mbid,
      name: artist.name,
      sortName: artist.sortName,
      country: artist.country,
      aliases: artist.aliases,
      genres: artist.artistGenres.map((link) => ({
        slug: link.genre.slug,
        confidence: link.confidence,
      })),
    })),
  };

  process.stdout.write(JSON.stringify(payload));
}

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function parseList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
