import { createHash } from "node:crypto";
import type { ParsedItem } from "./rss";

interface DiscogsSearchResult {
  title?: string;
  uri?: string;
  resource_url?: string;
  cover_image?: string;
  thumb?: string;
  year?: string;
  country?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  catno?: string;
}

interface DiscogsSearchResponse {
  results?: DiscogsSearchResult[];
}

function makeDedupeKey(title: string, url: string): string {
  const basis = title.trim().toLowerCase() + "|" + url.trim().toLowerCase();
  return createHash("sha1").update(basis).digest("hex");
}

function publishedAt(year: string | undefined) {
  const parsed = Number(year);
  if (Number.isInteger(parsed) && parsed > 1900) {
    return new Date(Date.UTC(parsed, 0, 1));
  }
  return new Date();
}

function summaryFor(result: DiscogsSearchResult) {
  return [
    result.format?.length ? `Format: ${result.format.join(", ")}` : null,
    result.label?.length ? `Label: ${result.label.join(", ")}` : null,
    result.genre?.length ? `Genre: ${result.genre.join(", ")}` : null,
    result.style?.length ? `Style: ${result.style.join(", ")}` : null,
    result.country ? `Country: ${result.country}` : null,
    result.year ? `Year: ${result.year}` : null,
    result.catno ? `Cat No: ${result.catno}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function releaseUrl(result: DiscogsSearchResult) {
  if (result.uri) {
    try {
      return new URL(result.uri, "https://www.discogs.com").toString();
    } catch {
      return null;
    }
  }
  return result.resource_url ?? null;
}

function imageUrl(result: DiscogsSearchResult) {
  const image = result.cover_image ?? result.thumb ?? null;
  if (!image || image.includes("/images/spacer.gif")) return null;
  return image;
}

export async function fetchDiscogsReleases(url: string): Promise<ParsedItem[]> {
  const token = process.env.DISCOGS_TOKEN ?? process.env.DISCOGS_USER_TOKEN;
  if (!token) {
    console.warn("  ! Discogs skipped: set DISCOGS_TOKEN to enable this source.");
    return [];
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "MusicNews/0.1 (+https://maksutovdesign.ru/musicnews)",
        Authorization: `Discogs token=${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.warn(`  ! Discogs failed: ${(err as Error).message}`);
    return [];
  }

  if (!res.ok) {
    console.warn(`  ! Discogs failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = (await res.json()) as DiscogsSearchResponse;
  return (data.results ?? [])
    .map((result) => {
      const title = result.title?.trim();
      const url = releaseUrl(result);
      if (!title || !url) return null;

      const summary = summaryFor(result) || null;
      return {
        title,
        url,
        summary,
        content: summary,
        imageUrl: imageUrl(result),
        publishedAt: publishedAt(result.year),
        dedupeKey: makeDedupeKey(title, url),
      } satisfies ParsedItem;
    })
    .filter((item): item is ParsedItem => Boolean(item));
}
