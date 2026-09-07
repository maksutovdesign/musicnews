import { prisma } from "@/lib/db";
import { SPECIAL_MBIDS, isRejectedCandidateName } from "./common-words";

// One-off cleanup for junk Artist rows created before the COMMON_WORDS /
// SPECIAL_MBIDS filters existed in classify.ts (e.g. "Manager", "Live",
// "Various Artists" resolved as real-but-irrelevant MusicBrainz entities).
// Safe to run anytime — it only removes rows that would be rejected by the
// current classifier; Prisma's onDelete: Cascade cleans up their
// ArticleArtist / ArtistGenre links automatically.
async function main() {
  const includeOrphans = process.argv.includes("--orphans");
  const artists = await prisma.artist.findMany({
    select: { id: true, name: true, mbid: true, articles: { select: { articleId: true }, take: 1 } },
  });

  const toDelete = artists.filter((a) => {
    if (a.mbid && SPECIAL_MBIDS.has(a.mbid)) return true;
    if (includeOrphans && a.articles.length === 0) return true;
    return isRejectedCandidateName(a.name);
  });

  if (toDelete.length === 0) {
    console.log("✓ nothing to clean up");
    return;
  }

  console.log(`→ removing ${toDelete.length} junk artist(s):`);
  for (const a of toDelete) console.log(`  - ${a.name}`);

  await prisma.artist.deleteMany({
    where: { id: { in: toDelete.map((a) => a.id) } },
  });

  console.log("✓ done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
