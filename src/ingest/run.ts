import { prisma } from "@/lib/db";
import { RSS_SOURCES } from "./sources";
import { fetchFeedResult, type ParsedItem } from "./rss";
import { fetchDiscogsReleaseResult } from "./discogs";
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
    const quality = sourceQuality(s);
    await prisma.source.upsert({
      where: { url: s.url },
      create: {
        name: s.name,
        url: s.url,
        type: s.type ?? "rss",
        category: s.category ?? "news",
        quality,
        region: s.region,
        language: s.language,
      },
      update: {
        name: s.name,
        type: s.type ?? "rss",
        category: s.category ?? "news",
        quality,
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
    const startedStored = stored;
    const config = sourceConfigs.get(source.url);
    const result =
      config?.type === "discogs"
        ? await fetchDiscogsReleaseResult(source.url)
        : await fetchFeedResult(source.url);

    if (result.error) {
      const errorCount = source.errorCount + 1;
      const shouldDisable =
        errorCount >= 5 && /403|404|timeout|timed out|ENOTFOUND|ECONNRESET|fetch failed/i.test(result.error);
      await prisma.source.update({
        where: { id: source.id },
        data: {
          errorCount,
          lastError: result.error.slice(0, 500),
          lastFetchedAt: new Date(),
          lastNewItems: 0,
          enabled: shouldDisable ? false : source.enabled,
        },
      });
      if (shouldDisable) console.warn(`  ! disabled after ${errorCount} repeated errors`);
      continue;
    }

    const items = result.items;
    for (const item of items) {
      if (!shouldKeepItem(item, config)) continue;
      const release = source.category === "release" ? releaseMetadata(item) : null;
      const imageUrl =
        item.imageUrl ??
        (source.category === "release" ? await fetchPageImage(item.url) : null);

      // Skip if we already have this article (by dedupeKey or url).
      const exists = await prisma.article.findFirst({
        where: { OR: [{ dedupeKey: item.dedupeKey }, { url: item.url }] },
        select: {
          id: true,
          imageUrl: true,
          releaseFormat: true,
          releaseCountry: true,
          releaseLabel: true,
          releaseCatalogNumber: true,
          releaseYear: true,
        },
      });
      if (exists) {
        const metadataUpdate = missingReleaseMetadata(exists, release);
        if ((!exists.imageUrl && imageUrl) || Object.keys(metadataUpdate).length) {
          await prisma.article.update({
            where: { id: exists.id },
            data: { imageUrl: exists.imageUrl ?? imageUrl, ...metadataUpdate },
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
          releaseFormat: release?.format,
          releaseCountry: release?.country,
          releaseLabel: release?.label,
          releaseCatalogNumber: release?.catalogNumber,
          releaseYear: release?.year,
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

    await prisma.source.update({
      where: { id: source.id },
      data: {
        errorCount: 0,
        lastError: null,
        lastFetchedAt: new Date(),
        lastNewItems: stored - startedStored,
      },
    });
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

function sourceQuality(source: (typeof RSS_SOURCES)[number]) {
  if (source.quality) return source.quality;
  if (source.type === "discogs") return "api";
  if (source.category === "release") return "marketplace";
  return "editorial";
}

function releaseMetadata(item: ParsedItem) {
  const text = [item.title, item.summary, item.content].filter(Boolean).join(" ");
  return {
    format: item.releaseFormat ?? inferReleaseFormat(text),
    country: item.releaseCountry ?? null,
    label: item.releaseLabel ?? fieldValue(text, /label\s*:?\s*([^·\n\r]+)/i),
    catalogNumber:
      item.releaseCatalogNumber ??
      fieldValue(text, /(?:cat\.?\s*(?:no|number)|catalog(?:ue)?\s*(?:no|number))\s*:?\s*([^·\n\r]+)/i),
    year: item.releaseYear ?? inferReleaseYear(text),
  };
}

function missingReleaseMetadata(
  existing: {
    releaseFormat: string | null;
    releaseCountry: string | null;
    releaseLabel: string | null;
    releaseCatalogNumber: string | null;
    releaseYear: number | null;
  },
  release: ReturnType<typeof releaseMetadata> | null,
) {
  if (!release) return {};
  const data: Record<string, string | number | null> = {};
  if (!existing.releaseFormat && release.format) data.releaseFormat = release.format;
  if (!existing.releaseCountry && release.country) data.releaseCountry = release.country;
  if (!existing.releaseLabel && release.label) data.releaseLabel = release.label;
  if (!existing.releaseCatalogNumber && release.catalogNumber) data.releaseCatalogNumber = release.catalogNumber;
  if (!existing.releaseYear && release.year) data.releaseYear = release.year;
  return data;
}

function inferReleaseFormat(text: string) {
  const normalized = text.toLowerCase();
  if (/\b(cassette|tape)\b/.test(normalized)) return "Cassette";
  if (/\b(cd|compact disc|cd-r)\b/.test(normalized)) return "CD";
  if (/\b(vinyl|lp|2lp|12"|10"|7"|record)\b/.test(normalized)) return "Vinyl";
  return null;
}

function inferReleaseYear(text: string) {
  const match = text.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function fieldValue(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1]?.trim().replace(/\s+/g, " ").slice(0, 120) || null;
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
