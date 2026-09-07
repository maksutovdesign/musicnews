import Parser from "rss-parser";
import { createHash } from "node:crypto";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "MusicNews/0.1 (+https://example.com)" },
  customFields: {
    item: [
      ["image", "image"],
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["itunes:image", "itunes:image"],
    ],
  },
});

export interface ParsedItem {
  title: string;
  url: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  dedupeKey: string;
  releaseFormat?: string | null;
  releaseCountry?: string | null;
  releaseLabel?: string | null;
  releaseCatalogNumber?: string | null;
  releaseYear?: number | null;
}

export interface FetchResult {
  items: ParsedItem[];
  error: string | null;
}

// Strip HTML tags and collapse whitespace for clean summaries.
function stripHtml(html: string | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length ? text.slice(0, 500) : null;
}

function imageFromHtml(html: string | undefined): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Drop common tracking params.
    for (const p of [...u.searchParams.keys()]) {
      if (p.startsWith("utm_") || p === "ref" || p === "fbclid") {
        u.searchParams.delete(p);
      }
    }
    return u.toString();
  } catch {
    return url;
  }
}

function makeDedupeKey(title: string, url: string): string {
  const basis = title.trim().toLowerCase() + "|" + normalizeUrl(url);
  return createHash("sha1").update(basis).digest("hex");
}

function parsePublishedDate(value: string | undefined): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function pickImage(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure as { url?: string } | undefined;
  if (enclosure?.url) return enclosure.url;

  const image = item.image as { url?: unknown } | string | undefined;
  const imageUrl =
    stringValue(image) ??
    (typeof image === "object" ? stringValue(image?.url) : null);
  if (imageUrl) return imageUrl;

  const mediaContent = firstValue(item["media:content"]);
  const mediaUrl = stringValue(mediaContent?.$?.url) ?? stringValue(mediaContent?.url);
  if (mediaUrl) return mediaUrl;

  const mediaThumbnail = firstValue(item["media:thumbnail"]);
  const thumbnailUrl = stringValue(mediaThumbnail?.$?.url) ?? stringValue(mediaThumbnail?.url);
  if (thumbnailUrl) return thumbnailUrl;

  const itunesImage = firstValue(item["itunes:image"]);
  const itunesUrl =
    stringValue(itunesImage?.$?.href) ??
    stringValue(itunesImage?.href) ??
    stringValue(itunesImage?.url);
  if (itunesUrl) return itunesUrl;

  return (
    imageFromHtml(item["content:encoded"] as string | undefined) ??
    imageFromHtml(item.content as string | undefined) ??
    imageFromHtml(item.summary as string | undefined)
  );
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return stringValue(value[0]);
  return null;
}

function firstValue(
  value: unknown,
): ({ $?: Record<string, string | undefined> } & Record<string, string | undefined>) | null {
  const item = Array.isArray(value) ? value[0] : value;
  return item && typeof item === "object"
    ? (item as { $?: Record<string, string | undefined> } & Record<string, string | undefined>)
    : null;
}

/** Fetch and normalize one RSS feed. Never throws; errors are returned for source health. */
export async function fetchFeedResult(url: string): Promise<FetchResult> {
  let feed;
  try {
    feed = await parser.parseURL(url);
  } catch (err) {
    console.warn(`  ! feed failed: ${url} — ${(err as Error).message}`);
    return { items: [], error: (err as Error).message };
  }

  const items: ParsedItem[] = [];
  for (const item of feed.items) {
    const rawItem = item as unknown as Record<string, unknown>;
    const link = item.link;
    const title = item.title;
    if (!link || !title) continue;

    const published = item.isoDate ?? item.pubDate;
    items.push({
      title: title.trim(),
      url: normalizeUrl(link),
      summary: stripHtml(item.contentSnippet ?? item.summary),
      content: stripHtml((rawItem["content:encoded"] as string | undefined) ?? item.content),
      imageUrl: pickImage(rawItem),
      publishedAt: parsePublishedDate(published),
      dedupeKey: makeDedupeKey(title, link),
    });
  }
  return { items, error: null };
}

/** Backward-compatible helper for scripts/tests that only need items. */
export async function fetchFeed(url: string): Promise<ParsedItem[]> {
  const result = await fetchFeedResult(url);
  return result.items;
}
