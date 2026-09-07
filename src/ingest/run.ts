import { prisma } from "@/lib/db";
import { RSS_SOURCES } from "./sources";
import { fetchFeed } from "./rss";
import { fetchDiscogsReleases } from "./discogs";
import { classifyArticle } from "./classify";
import { releaseArtistTitle } from "./release-artists";
import { fetchPageImage } from "./page-image";
import { fileURLToPath } from "node:url";

/**
 * One ingestion pass:
 *   1. ensure Source rows exist
 *   2. fetch each RSS feed
 *   3. store new (deduped) articles
 *   4. classify them (artist -> country/genre)
 *
 * Safe to run repeatedly (cron): dedupeKey/url uniqueness makes it idempotent.
 * Classification is rate-limited by MusicBrainz (~1 artist/sec), so the first
 * runs are slow and speed up as the artist cache fills.
 */
export async function runIngest() {
  console.log("→ ensuring sources…");
  const sourceConfigs = new Map(RSS_SOURCES.map((source) => [source.url, source]));
  for (const s of RSS_SOURCES) {
    await prisma.source.upsert({
      where: { url: s.url },
      create: {
        name: s.name,
        url: s.url,
        type: s.type ?? "rss",
        category: s.category ?? "news",
        region: s.region,
        language: s.language,
      },
      update: {
        name: s.name,
        type: s.type ?? "rss",
        category: s.category ?? "news",
        region: s.region,
        language: s.language,
      },
    });
  }
  await prisma.source.updateMany({
    where: {
      type: { in: ["rss", "discogs"] },
      url: { notIn: RSS_SOURCES.map((s) => s.url) },
      articles: { none: {} },
    },
    data: { enabled: false },
  });

  const sources = await prisma.source.findMany({
    where: { enabled: true, type: { in: ["rss", "discogs"] } },
  });
  let stored = 0;
  const toClassify: {
    id: string;
    title: string;
    summary: string | null;
    content: string | null;
  }[] = [];

  for (const source of sources) {
    console.log(`→ ${source.name}`);
    const config = sourceConfigs.get(source.url);
    const items =
      config?.type === "discogs"
        ? await fetchDiscogsReleases(source.url)
        : await fetchFeed(source.url);
    for (const item of items) {
      if (!shouldKeepItem(item, config)) continue;
      const imageUrl =
        item.imageUrl ??
        (source.category === "release" ? await fetchPageImage(item.url) : null);

      // Skip if we already have this article (by dedupeKey or url).
      const exists = await prisma.article.findFirst({
        where: { OR: [{ dedupeKey: item.dedupeKey }, { url: item.url }] },
        select: { id: true, imageUrl: true },
      });
      if (exists) {
        if (!exists.imageUrl && imageUrl) {
          await prisma.article.update({
            where: { id: exists.id },
            data: { imageUrl },
          });
        }
        continue;
      }

      const article = await prisma.article.create({
        data: {
          title: item.title,
          url: item.url,
          summary: item.summary,
          content: item.content,
          imageUrl,
          language: source.language,
          publishedAt: item.publishedAt,
          dedupeKey: item.dedupeKey,
          sourceId: source.id,
        },
      });
      stored++;
      toClassify.push({
        id: article.id,
        title:
          source.category === "release"
            ? releaseArtistTitle(article.summary, article.content)
            : article.title,
        summary: article.summary,
        content: article.content,
      });
    }
  }

  console.log(`→ stored ${stored} new articles; classifying…`);
  let classified = 0;
  for (const a of toClassify) {
    const res = await classifyArticle(a.id, a.title, [
      a.summary ?? "",
      a.content ?? "",
    ]);
    classified++;
    if (classified % 10 === 0) {
      console.log(`  …${classified}/${toClassify.length}`);
    }
    void res;
  }

  console.log(`✓ done. ${stored} new, ${classified} classified.`);

  return { stored, classified };
}

export function shouldKeepItem(
  item: { title: string; summary: string | null; content: string | null },
  config: (typeof RSS_SOURCES)[number] | undefined,
) {
  const text = [item.title, item.summary, item.content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    config?.excludeKeywords?.some((keyword) =>
      text.includes(keyword.toLowerCase()),
    )
  ) {
    return false;
  }

  if (!config?.includeKeywords?.length) return true;
  return config.includeKeywords.some((keyword) =>
    text.includes(keyword.toLowerCase()),
  );
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runIngest()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
