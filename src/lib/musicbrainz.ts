// Minimal MusicBrainz client used for classification.
// MusicBrainz is our source of truth for an artist's country and genre tags.
// Their rules require: a descriptive User-Agent, and <= 1 request/second.

const BASE = "https://musicbrainz.org/ws/2";
const APP =
  process.env.MUSICBRAINZ_APP ?? "MusicNews/0.1 (contact-not-set@example.com)";

let lastRequest = 0;

// Simple serial rate limiter: ensure at least 1100ms between calls.
async function rateLimit() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

async function mb<T>(path: string): Promise<T | null> {
  await rateLimit();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": APP, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface ResolvedArtist {
  mbid: string;
  name: string;
  sortName: string | null;
  country: string | null; // ISO country code
  aliases: string[];
  tags: string[]; // raw genre tags, highest-count first
  score: number; // MusicBrainz match score 0..100
}

export interface MBArtist {
  id: string;
  name: string;
  "sort-name"?: string;
  type?: string;
  disambiguation?: string;
  country?: string;
  area?: { "iso-3166-1-codes"?: string[] };
  "begin-area"?: { "iso-3166-1-codes"?: string[] };
  score?: number;
  tags?: { name: string; count: number }[];
  aliases?: { name?: string; locale?: string | null; primary?: boolean | null }[];
}

export interface ArtistSearchResult {
  count: number;
  artists: MBArtist[];
}

// MusicBrainz's search is a fuzzy Lucene query: for a two-word input like
// "Ear Detail" it will happily return a one-word artist named "Detail" at a
// high score, because the score reflects partial-term relevance, not "is
// this the same name". We only trust a hit whose name (or sort-name) is the
// *same* name as the query, modulo case/punctuation — not merely similar.
function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Resolve an artist name to its MusicBrainz identity, country and tags.
 * Returns null if there is no confident, name-exact match.
 */
export async function resolveArtist(
  name: string,
): Promise<ResolvedArtist | null> {
  const wanted = normalizeName(name);
  let top: MBArtist | undefined;

  for (const query of [name, `artist:"${name.replace(/"/g, '\\"')}"`]) {
    const q = encodeURIComponent(query);
    const search = await mb<{ artists?: MBArtist[] }>(
      `/artist?query=${q}&fmt=json&limit=10`,
    );
    top = search?.artists?.find(
      (a) =>
        normalizeName(a.name) === wanted ||
        normalizeName(a["sort-name"] ?? "") === wanted ||
        (a.aliases ?? []).some((alias) => normalizeName(alias.name ?? "") === wanted),
    );
    if (top) break;
  }

  if (!top || (top.score ?? 0) < 80) return null;

  // Fetch full entity to get tags reliably.
  const full =
    (await mb<MBArtist>(`/artist/${top.id}?inc=tags+aliases&fmt=json`)) ?? top;

  const country =
    full.country ??
    full.area?.["iso-3166-1-codes"]?.[0] ??
    full["begin-area"]?.["iso-3166-1-codes"]?.[0] ??
    null;

  const tags = (full.tags ?? [])
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((t) => t.name);

  return {
    mbid: full.id,
    name: full.name,
    sortName: full["sort-name"] ?? null,
    country,
    aliases: (full.aliases ?? [])
      .map((alias) => alias.name)
      .filter((name): name is string => Boolean(name?.trim())),
    tags,
    score: top.score ?? 0,
  };
}

/**
 * Search MusicBrainz artists with a raw Lucene query. Used by the catalog
 * importer, where we intentionally import artist rows before they appear in
 * news articles.
 */
export async function searchArtists(
  query: string,
  limit: number,
  offset: number,
): Promise<ArtistSearchResult | null> {
  const q = encodeURIComponent(query);
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);
  const search = await mb<{ count?: number; artists?: MBArtist[] }>(
    `/artist?query=${q}&fmt=json&limit=${safeLimit}&offset=${safeOffset}`,
  );

  if (!search?.artists) return null;
  return {
    count: search.count ?? search.artists.length,
    artists: search.artists,
  };
}
