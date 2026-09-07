import { prisma } from "@/lib/db";
import { classifyArticle } from "./classify";
import { releaseArtistTitle } from "./release-artists";

// Re-run classification over already-stored articles. Useful after changing
// the classifier (new stopwords, confidence rules, genre mappings) or after
// a partial/interrupted `npm run ingest` run left articles unclassified.
// Idempotent: classifyArticle upserts links, so re-running is always safe.
async function main() {
  const onlyUnclassified = process.argv.includes("--only-unclassified");
  const limit = parseLimit();

  const articles = await prisma.article.findMany({
    where: onlyUnclassified ? { artists: { none: {} } } : {},
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      source: { select: { category: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  console.log(`→ reclassifying ${articles.length} article(s)…`);
  let done = 0;
  for (const a of articles) {
    const title =
      a.source.category === "release"
        ? releaseArtistTitle(a.summary, a.content)
        : a.title;
    await classifyArticle(a.id, title, [a.summary ?? "", a.content ?? ""]);
    done++;
    if (done % 10 === 0) console.log(`  …${done}/${articles.length}`);
  }
  console.log(`✓ done. ${done} reclassified.`);
}

function parseLimit() {
  const raw = process.argv
    .find((arg) => arg.startsWith("--limit="))
    ?.slice("--limit=".length);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
