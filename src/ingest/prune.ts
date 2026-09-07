import { prisma } from "@/lib/db";
import { RSS_SOURCES } from "./sources";
import { shouldKeepItem } from "./run";

// Remove already-stored articles that no longer pass a source's quality rules.
// Useful after tightening broad feeds such as Billboard or InterMedia.
async function main() {
  const apply = process.argv.includes("--apply");
  const sourceConfigs = new Map(RSS_SOURCES.map((source) => [source.url, source]));
  const sources = await prisma.source.findMany({
    where: { type: "rss", url: { in: RSS_SOURCES.map((source) => source.url) } },
    select: { id: true, name: true, url: true },
  });

  let checked = 0;
  let deleted = 0;

  for (const source of sources) {
    const config = sourceConfigs.get(source.url);
    if (!config?.includeKeywords?.length && !config?.excludeKeywords?.length) continue;

    const articles = await prisma.article.findMany({
      where: { sourceId: source.id },
      select: { id: true, title: true, summary: true, content: true },
    });

    for (const article of articles) {
      checked++;
      if (shouldKeepItem(article, config)) continue;
      if (apply) {
        await prisma.article.delete({ where: { id: article.id } });
      }
      deleted++;
    }

    console.log(`→ ${source.name}: checked ${articles.length}`);
  }

  console.log(
    apply
      ? `✓ done. ${checked} checked, ${deleted} deleted.`
      : `✓ dry run. ${checked} checked, ${deleted} would be deleted. Re-run with --apply to delete.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
