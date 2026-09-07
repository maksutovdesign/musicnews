import { prisma } from "@/lib/db";
import { resolveArtist } from "@/lib/musicbrainz";
import { normalizeGenres } from "@/lib/genres";
import {
  COMMON_WORDS,
  NAME_JOINERS,
  SPECIAL_MBIDS,
  isRejectedCandidateName,
  normalizeCandidateName,
} from "./common-words";

// Words that look like proper nouns in headlines but are not artist names.
// Keeps the candidate extractor from wasting rate-limited MusicBrainz lookups.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with",
  "new", "watch", "listen", "hear", "video", "album", "song", "single", "ep",
  "track", "premiere", "review", "interview", "announce", "announces",
  "announced", "release", "releases", "released", "shares", "share", "drops",
  "drop", "reveals", "reveal", "tour", "live", "festival", "best", "top",
  "read", "stream", "premieres", "debut", "cover", "remix", "feat", "ft",
  "us", "uk", "york", "los", "angeles", "record", "records", "music", "news",
  "now", "out", "here", "how", "why", "what", "who", "week", "day", "year",
]);

interface CatalogArtist {
  id: string;
  name: string;
  normalizedName: string;
}

let catalogArtistsCache: CatalogArtist[] | null = null;

function normalizeMatchText(text: string): string {
  return ` ${normalizeCandidateName(text)} `;
}

function phrasePattern(normalizedName: string): RegExp {
  const escaped = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
}

function canMatchCatalogName(name: string, normalizedName: string) {
  const words = normalizedName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return true;
  if (normalizedName.length >= 4) return true;
  return /^[\p{Lu}0-9!?.&-]{2,}$/u.test(name) && normalizedName.length >= 2;
}

async function catalogArtists(): Promise<CatalogArtist[]> {
  if (catalogArtistsCache) return catalogArtistsCache;

  const artists = await prisma.artist.findMany({
    where: { mbid: { not: null } },
    select: { id: true, name: true, sortName: true, aliases: true },
  });

  const artistNames = artists.flatMap((artist) => {
    const aliases = safeJsonArray(artist.aliases);
    return [artist.name, artist.sortName, ...aliases]
      .filter((name): name is string => Boolean(name?.trim()))
      .map((name) => ({ id: artist.id, name }));
  });

  catalogArtistsCache = artistNames
    .map((artistName) => ({
      id: artistName.id,
      name: artistName.name,
      normalizedName: normalizeCandidateName(artistName.name),
    }))
    .filter(
      (artist, index, all) =>
        all.findIndex(
          (other) =>
            other.id === artist.id &&
            other.normalizedName === artist.normalizedName,
        ) === index,
    )
    .filter(
      (artist) =>
        !isRejectedCandidateName(artist.name) &&
        canMatchCatalogName(artist.name, artist.normalizedName),
    )
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length);

  return catalogArtistsCache;
}

function safeJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function matchCatalogArtists(
  title: string,
  bodyTexts: string[],
  titleCandidates: string[],
) {
  const normalizedTitle = normalizeMatchText(title);
  const normalizedTexts = [title, ...bodyTexts]
    .filter(Boolean)
    .map(normalizeMatchText)
    .filter((text) => text.trim().length > 0);
  const normalizedCandidates = new Set(titleCandidates.map(normalizeCandidateName));
  if (normalizedTexts.length === 0) return [];

  const matches = new Map<string, { id: string; confidence: number }>();
  for (const artist of await catalogArtists()) {
    const pattern = phrasePattern(artist.normalizedName);
    const isSingleWord = !artist.normalizedName.includes(" ");
    const matched = isSingleWord
      ? normalizedCandidates.has(artist.normalizedName) && pattern.test(normalizedTitle)
      : normalizedTexts.some((text) => pattern.test(text));
    if (!matched) continue;

    matches.set(artist.id, {
      id: artist.id,
      confidence: artist.normalizedName.length >= 8 ? 0.92 : 0.75,
    });
  }

  return [...matches.values()];
}

/**
 * Heuristic artist-name extraction from a headline. Finds runs of
 * capitalized words (allowing internal lowercase joiners like "of"/"and")
 * and filters obvious non-names. This is a deliberately simple NER stand-in;
 * MusicBrainz resolution below is what confirms a candidate is a real artist.
 */
export function extractCandidateArtists(title: string): string[] {
  const cleaned = title
    .replace(/[""'']/g, '"')
    .replace(/[’']s\b/g, ".");
  // Split on punctuation that separates clauses.
  const segments = cleaned.split(/[:–—\-|,.!?()"]/);
  const candidates = new Set<string>();

  for (const seg of segments) {
    const words = seg.trim().split(/\s+/).filter(Boolean);
    let run: string[] = [];
    const flush = () => {
      if (run.length === 0) return;
      const phrase = run.join(" ").trim();
      const lower = phrase.toLowerCase();
      const words = lower.split(/\s+/);
      // Title Case headlines capitalize nearly every word, so a run of
      // capitalized words is a weak signal on its own. Reject phrases that
      // are entirely made of common English/headline words (e.g. "New Song",
      // "Various Artists") — real artist names almost never look like that.
      const allCommon = words.every((w) => COMMON_WORDS.has(w));
      if (
        run.length <= 4 &&
        phrase.length >= 2 &&
        !STOPWORDS.has(lower) &&
        !allCommon &&
        !isRejectedCandidateName(phrase) &&
        !/^\d+$/.test(phrase)
      ) {
        candidates.add(phrase);
      }
      run = [];
    };

    for (const word of words) {
      const isCap = /^\p{Lu}[\p{L}'&.]*$/u.test(word);
      const isJoiner = NAME_JOINERS.has(word.toLowerCase());
      const isStylizedSuffix = ["xcx"].includes(word.toLowerCase());
      if (isCap || ((isJoiner || isStylizedSuffix) && run.length > 0)) {
        run.push(word);
      } else {
        flush();
      }
    }
    flush();
  }

  // Trim trailing joiners like "and"/"the".
  return [...candidates]
    .map((c) => c.replace(/\s+(and|the|of|&)$/i, "").trim())
    .filter((c) => c.length >= 2 && !isRejectedCandidateName(c));
}

/**
 * Ensure an Artist row exists for a candidate name, resolving via MusicBrainz
 * (and caching the result). Returns the artist id + a confidence score, or
 * null if the candidate is not a confident music artist.
 */
async function resolveAndUpsertArtist(
  name: string,
): Promise<{ id: string; confidence: number } | null> {
  if (isRejectedCandidateName(name)) return null;

  // Cache hit by name (case-insensitive) avoids re-hitting MusicBrainz.
  const existing = await prisma.artist.findFirst({
    where: { name: { equals: name } },
  });
  if (existing) {
    if (isRejectedCandidateName(existing.name)) return null;
    return { id: existing.id, confidence: existing.mbid ? 0.9 : 0.4 };
  }

  if (!allowsMusicBrainzLookup()) return null;
  if (!shouldResolveCandidate(name)) return null;

  const resolved = await resolveArtist(name);
  if (
    !resolved ||
    SPECIAL_MBIDS.has(resolved.mbid) ||
    isRejectedCandidateName(resolved.name)
  ) {
    return null;
  }

  const artist = await prisma.artist.upsert({
    where: { mbid: resolved.mbid },
    create: {
      mbid: resolved.mbid,
      name: resolved.name,
      sortName: resolved.sortName,
      country: resolved.country,
      aliases: JSON.stringify(resolved.aliases),
    },
    update: { country: resolved.country, aliases: JSON.stringify(resolved.aliases) },
  });

  // Attach normalized genres to the artist (idempotent).
  const slugs = normalizeGenres(resolved.tags);
  for (const slug of slugs) {
    const genre = await prisma.genre.findUnique({ where: { slug } });
    if (!genre) continue;
    await prisma.artistGenre.upsert({
      where: { artistId_genreId: { artistId: artist.id, genreId: genre.id } },
      create: { artistId: artist.id, genreId: genre.id, confidence: 0.8 },
      update: {},
    });
  }

  return { id: artist.id, confidence: resolved.score >= 90 ? 0.95 : 0.75 };
}

function shouldResolveCandidate(name: string) {
  const normalized = normalizeCandidateName(name);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length !== 1) return true;
  return false;
}

function allowsMusicBrainzLookup() {
  return process.env.MUSICBRAINZ_LOOKUP !== "0";
}

/**
 * Classify one already-stored article: extract artists, resolve them, and
 * derive the article's genres from its artists. Links carry confidence scores
 * so the UI can filter out low-quality matches.
 */
export async function classifyArticle(
  articleId: string,
  title: string,
  bodyTexts: string[] = [],
) {
  const candidates = extractCandidateArtists(title);
  const genreConfidence = new Map<string, number>();
  const linkedArtists = new Map<string, number>();

  await prisma.articleArtist.deleteMany({ where: { articleId } });
  await prisma.articleGenre.deleteMany({ where: { articleId } });

  const linkArtist = async (artistId: string, confidence: number) => {
    const previous = linkedArtists.get(artistId);
    if (previous !== undefined && previous >= confidence) return;
    linkedArtists.set(artistId, confidence);

    await prisma.articleArtist.upsert({
      where: { articleId_artistId: { articleId, artistId } },
      create: { articleId, artistId, confidence },
      update: { confidence },
    });

    // Roll the artist's genres up to the article.
    const artistGenres = await prisma.artistGenre.findMany({
      where: { artistId },
    });
    for (const ag of artistGenres) {
      const c = Math.min(confidence, ag.confidence);
      genreConfidence.set(
        ag.genreId,
        Math.max(genreConfidence.get(ag.genreId) ?? 0, c),
      );
    }
  };

  for (const match of await matchCatalogArtists(title, bodyTexts, candidates)) {
    await linkArtist(match.id, match.confidence);
  }

  for (const name of candidates) {
    const res = await resolveAndUpsertArtist(name);
    if (!res) continue;
    await linkArtist(res.id, res.confidence);
  }

  for (const [genreId, confidence] of genreConfidence) {
    await prisma.articleGenre.upsert({
      where: { articleId_genreId: { articleId, genreId } },
      create: { articleId, genreId, confidence },
      update: { confidence },
    });
  }

  return { artists: linkedArtists.size, genres: genreConfidence.size };
}
