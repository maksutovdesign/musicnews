import { prisma } from "@/lib/db";
import { GENRES, normalizeGenres } from "@/lib/genres";
import {
  MBArtist,
  ResolvedArtist,
  resolveArtist,
  searchArtists,
} from "@/lib/musicbrainz";
import { isRealCountryCode } from "@/lib/countries";
import { SPECIAL_MBIDS, isRejectedCandidateName } from "./common-words";

const DEFAULT_COUNTRIES = [
  "RU",
  "UA",
  "BY",
  "KZ",
  "US",
  "GB",
  "CA",
  "AU",
  "IE",
  "FR",
  "DE",
  "NL",
  "SE",
  "NO",
  "DK",
  "FI",
  "ES",
  "IT",
  "JP",
  "KR",
  "BR",
  "MX",
  "NG",
  "ZA",
];

const DEFAULT_GENRES = [
  "pop",
  "rock",
  "hip-hop",
  "electronic",
  "rnb",
  "jazz",
  "metal",
  "punk",
  "country",
  "folk",
  "reggae",
  "latin",
  "afrobeats",
];

const ALLOWED_TYPES = new Set(["Person", "Group"]);

const POPULAR_ARTISTS = [
  "Placebo",
  "Radiohead",
  "Depeche Mode",
  "The Cure",
  "Joy Division",
  "New Order",
  "Massive Attack",
  "Portishead",
  "Björk",
  "Nirvana",
  "Pearl Jam",
  "Soundgarden",
  "Alice in Chains",
  "Metallica",
  "Rammstein",
  "The Prodigy",
  "Daft Punk",
  "The Chemical Brothers",
  "Aphex Twin",
  "Underworld",
  "Arctic Monkeys",
  "Oasis",
  "Blur",
  "Gorillaz",
  "Muse",
  "Coldplay",
  "Red Hot Chili Peppers",
  "Nine Inch Nails",
  "The Smashing Pumpkins",
  "Tool",
  "Queens of the Stone Age",
  "Foo Fighters",
  "Nick Cave and the Bad Seeds",
  "PJ Harvey",
  "David Bowie",
  "Madonna",
  "Prince",
  "Beyoncé",
  "Kanye West",
  "Jay-Z",
  "Travis Scott",
  "Taylor Swift",
  "Lana Del Rey",
  "Billie Eilish",
  "Kendrick Lamar",
  "Drake",
  "The Weeknd",
  "SZA",
  "Tyler, the Creator",
  "Кино",
  "Аквариум",
  "Nautilus Pompilius",
  "Би-2",
  "Сплин",
  "Земфира",
  "Мумий Тролль",
  "ДДТ",
  "Алиса",
  "Король и Шут",
  "Агата Кристи",
  "Каста",
  "Oxxxymiron",
  "Баста",
  "Noize MC",
  "Скриптонит",
  "ATL",
  "Хаски",
  "IC3PEAK",
  "Shortparis",
  "СБПЧ",
  "Аигел",
  "Монеточка",
  "Молчат Дома",
  "t.A.T.u.",
  "Алла Пугачёва",
  "Филипп Киркоров",
  "Михаил Шуфутинский",
];

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function parseList(value: string | undefined, fallback: string[]) {
  return (value ?? fallback.join(","))
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseLimit() {
  const raw = Number(argValue("limit") ?? 1000);
  if (!Number.isInteger(raw) || raw < 1) return 1000;
  return raw;
}

function artistCountry(artist: MBArtist) {
  return (
    artist.country ??
    artist.area?.["iso-3166-1-codes"]?.[0] ??
    artist["begin-area"]?.["iso-3166-1-codes"]?.[0] ??
    null
  );
}

function isImportableArtist(artist: MBArtist) {
  if (!artist.id || SPECIAL_MBIDS.has(artist.id)) return false;
  if (artist.type && !ALLOWED_TYPES.has(artist.type)) return false;
  if (isRejectedCandidateName(artist.name)) return false;
  return true;
}

async function attachGenres(artistId: string, slugs: string[]) {
  for (const slug of slugs) {
    const genre = await prisma.genre.findUnique({ where: { slug } });
    if (!genre) continue;
    await prisma.artistGenre.upsert({
      where: { artistId_genreId: { artistId, genreId: genre.id } },
      create: { artistId, genreId: genre.id, confidence: 0.7 },
      update: { confidence: 0.7 },
    });
  }
}

async function importArtist(rawArtist: MBArtist, seedGenreSlug: string) {
  const country = artistCountry(rawArtist);
  const rawTags = rawArtist.tags?.map((t) => t.name) ?? [];
  const slugs = new Set(normalizeGenres(rawTags));
  slugs.add(seedGenreSlug);

  const seedGenre = GENRES.find((g) => g.slug === seedGenreSlug);
  if (seedGenre?.parent) slugs.add(seedGenre.parent);

  const artist = await prisma.artist.upsert({
    where: { mbid: rawArtist.id },
    create: {
      mbid: rawArtist.id,
      name: rawArtist.name,
      sortName: rawArtist["sort-name"] ?? null,
      country,
      aliases: JSON.stringify(
        (rawArtist.aliases ?? [])
          .map((alias) => alias.name)
          .filter((name): name is string => Boolean(name?.trim())),
      ),
    },
    update: {
      name: rawArtist.name,
      sortName: rawArtist["sort-name"] ?? null,
      country,
      aliases: JSON.stringify(
        (rawArtist.aliases ?? [])
          .map((alias) => alias.name)
          .filter((name): name is string => Boolean(name?.trim())),
      ),
    },
  });

  await attachGenres(artist.id, [...slugs]);
  return artist.id;
}

async function importResolvedArtist(resolved: ResolvedArtist) {
  const slugs = new Set(normalizeGenres(resolved.tags));

  const artist = await prisma.artist.upsert({
    where: { mbid: resolved.mbid },
    create: {
      mbid: resolved.mbid,
      name: resolved.name,
      sortName: resolved.sortName,
      country: resolved.country,
      aliases: JSON.stringify(resolved.aliases),
    },
    update: {
      name: resolved.name,
      sortName: resolved.sortName,
      country: resolved.country,
      aliases: JSON.stringify(resolved.aliases),
    },
  });

  await attachGenres(artist.id, [...slugs]);
  return artist.id;
}

async function importNamedArtists(names: string[]) {
  const seen = new Set<string>();
  let imported = 0;
  let skipped = 0;

  for (const rawName of names) {
    const name = rawName.trim();
    const key = name.toLocaleLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);

    const resolved = await resolveArtist(name);
    if (!resolved || SPECIAL_MBIDS.has(resolved.mbid)) {
      skipped++;
      console.log(`  - skipped: ${name}`);
      continue;
    }

    await importResolvedArtist(resolved);
    imported++;
    console.log(`  + ${resolved.name}`);
  }

  console.log(`✓ named import done. ${imported} imported/updated, ${skipped} skipped.`);
}

async function main() {
  const names = parseList(argValue("names"), []);
  const popular = process.argv.includes("--popular");
  if (popular || names.length > 0) {
    await importNamedArtists([...(popular ? POPULAR_ARTISTS : []), ...names]);
    return;
  }

  const limit = parseLimit();
  const countries = parseList(argValue("countries"), DEFAULT_COUNTRIES)
    .map((c) => c.toUpperCase())
    .filter(isRealCountryCode);
  const genres = parseList(argValue("genres"), DEFAULT_GENRES).filter((slug) =>
    GENRES.some((g) => g.slug === slug),
  );

  if (countries.length === 0 || genres.length === 0) {
    throw new Error("No valid countries or genres selected.");
  }

  console.log(
    `-> importing up to ${limit} artists across ${countries.length} countries and ${genres.length} genres`,
  );

  const seenMbids = new Set<string>();
  const existingMbids = new Set(
    (
      await prisma.artist.findMany({
        where: { mbid: { not: null } },
        select: { mbid: true },
      })
    ).map((artist) => artist.mbid!),
  );
  let imported = 0;
  let skipped = 0;
  let skippedExisting = 0;

  for (const genre of genres) {
    for (const country of countries) {
      if (imported >= limit) break;

      const query = `tag:"${genre}" AND country:${country}`;
      console.log(`-> ${genre} / ${country}`);

      for (let offset = 0; imported < limit; offset += 100) {
        const page = await searchArtists(query, 100, offset);
        if (!page || page.artists.length === 0) break;

        for (const artist of page.artists) {
          if (imported >= limit) break;
          if (seenMbids.has(artist.id)) continue;
          seenMbids.add(artist.id);
          if (existingMbids.has(artist.id)) {
            skippedExisting++;
            continue;
          }

          if (!isImportableArtist(artist)) {
            skipped++;
            continue;
          }

          await importArtist(artist, genre);
          existingMbids.add(artist.id);
          imported++;
          if (imported % 100 === 0) console.log(`  ...${imported}/${limit}`);
        }

        if (page.artists.length < 100 || offset + 100 >= page.count) break;
      }
    }
  }

  console.log(
    `✓ done. ${imported} imported, ${skipped} skipped, ${skippedExisting} already in catalog.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
