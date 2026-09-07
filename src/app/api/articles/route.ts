import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const MIN_CONFIDENCE = 0.6;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function cleanParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

// GET /api/articles?country=GB&genre=techno&source=<id>&q=...&limit=50
// JSON feed mirroring the homepage filters — for a future mobile app / widgets.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const country = cleanParam(sp.get("country"));
  const genre = cleanParam(sp.get("genre"));
  const source = cleanParam(sp.get("source"));
  const q = cleanParam(sp.get("q"));
  const limit = parseLimit(sp.get("limit"));

  const and: Prisma.ArticleWhereInput[] = [];
  if (country)
    and.push({ artists: { some: { confidence: { gte: MIN_CONFIDENCE }, artist: { country: country.toUpperCase() } } } });
  if (genre)
    and.push({ genres: { some: { confidence: { gte: MIN_CONFIDENCE }, genre: { slug: genre } } } });
  if (source) and.push({ sourceId: source });
  if (q) and.push({ title: { contains: q } });

  const articles = await prisma.article.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: {
      source: { select: { name: true } },
      genres: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { genre: { select: { slug: true, name: true } } } },
      artists: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { artist: { select: { name: true, country: true } } } },
    },
  });

  return NextResponse.json({
    count: articles.length,
    articles: articles.map((a) => ({
      title: a.title,
      url: a.url,
      summary: a.summary,
      imageUrl: a.imageUrl,
      publishedAt: a.publishedAt,
      source: a.source.name,
      artists: a.artists.map((x) => ({ name: x.artist.name, country: x.artist.country })),
      genres: a.genres.map((g) => ({ slug: g.genre.slug, name: g.genre.name })),
    })),
  });
}
