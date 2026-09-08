import { prisma } from "@/lib/db";
import { countryName, flag, isRealCountryCode } from "@/lib/countries";
import { appPath } from "@/lib/paths";
import { ArticleFeed, type FeedArticle } from "./article-feed";
import { publicArticleWhere } from "@/lib/moderation";
import type { Prisma } from "@prisma/client";

// Minimum confidence for a genre/country match to count. Keeps low-quality
// heuristic matches out of the filtered views (classification-quality first).
const MIN_CONFIDENCE = 0.6;
const PAGE_SIZE = 60;
const SOURCE_QUALITIES = [
  { slug: "editorial", label: "Editorial" },
  { slug: "google", label: "Google News" },
  { slug: "marketplace", label: "Marketplaces" },
  { slug: "api", label: "APIs" },
];

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  country?: string;
  genre?: string;
  source?: string;
  quality?: string;
  q?: string;
  sort?: string;
  page?: string;
}>;

function buildQuery(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `${appPath("/")}?${s}` : appPath("/");
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { country, genre, source } = sp;
  const quality = SOURCE_QUALITIES.find((item) => item.slug === sp.quality)?.slug;
  const q = sp.q?.trim();
  const sort = sp.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Build the article filter.
  const where: Prisma.ArticleWhereInput = {};
  const and: Prisma.ArticleWhereInput[] = [];

  if (country) {
    and.push({
      artists: {
        some: {
          confidence: { gte: MIN_CONFIDENCE },
          artist: { country: country.toUpperCase() },
        },
      },
    });
  }
  if (genre) {
    and.push({
      genres: {
        some: { confidence: { gte: MIN_CONFIDENCE }, genre: { slug: genre } },
      },
    });
  }
  if (source) and.push({ sourceId: source });
  if (quality) and.push({ source: { quality } });
  if (q) and.push({ title: { contains: q } });
  and.push({ source: { category: "news" } });
  and.push(publicArticleWhere());
  if (and.length) where.AND = and;

  // Fetch articles + facets in parallel.
  const [articles, total, genres, sources, artistCountries] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        source: true,
        genres: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { genre: true } },
        artists: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { artist: true } },
      },
    }),
    prisma.article.count({ where }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.source.findMany({ where: { enabled: true, category: "news" }, orderBy: { name: "asc" } }),
    prisma.artist.findMany({
      where: { country: { not: null }, articles: { some: {} } },
      select: { country: true },
      distinct: ["country"],
    }),
  ]);

  const countries = [
    ...new Set(artistCountries.map((a) => a.country!).filter(Boolean)),
  ]
    .filter(isRealCountryCode)
    .sort();
  const hasFilter = Boolean(country || genre || source || quality || q);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCountry = country && isRealCountryCode(country) ? country.toUpperCase() : undefined;
  const activeGenre = genres.find((g) => g.slug === genre);
  const activeSource = sources.find((s) => s.id === source);
  const activeQuality = SOURCE_QUALITIES.find((item) => item.slug === quality);
  const feedArticles: FeedArticle[] = articles.map((a) => {
    const artistCountries = [
      ...new Set(a.artists.map((x) => x.artist.country).filter(Boolean) as string[]),
    ].filter(isRealCountryCode);

    return {
      id: a.id,
      title: a.title,
      url: a.url,
      summary: a.summary,
      content: a.content,
      imageUrl: a.imageUrl,
      publishedAt: a.publishedAt.toISOString(),
      sourceName: a.source.name,
      sourceQuality: a.source.quality,
      releaseFormat: a.releaseFormat,
      releaseCountry: a.releaseCountry,
      releaseLabel: a.releaseLabel,
      releaseCatalogNumber: a.releaseCatalogNumber,
      releaseYear: a.releaseYear,
      countries: artistCountries.map((c) => ({
        code: c,
        label: countryName(c),
        flag: flag(c),
      })),
      artists: a.artists.map((x) => x.artist.name),
      genres: a.genres.map((g) => g.genre.name),
    };
  });

  return (
    <div className="layout">
      <aside className="filters">
        {hasFilter && (
          <a className="reset" href={appPath("/")}>← reset all filters</a>
        )}

        <h3>Country</h3>
        <div className="chips">
          {countries.length === 0 && <span className="tagline">— none yet —</span>}
          {countries.map((c) => (
            <a
              key={c}
              className={`chip ${country?.toUpperCase() === c ? "active" : ""}`}
              href={buildQuery({ genre, source, quality, q, sort, country: country?.toUpperCase() === c ? undefined : c })}
            >
              {flag(c)} {countryName(c)}
            </a>
          ))}
        </div>

        <h3>Genre</h3>
        <div className="chips">
          {genres.map((g) => (
            <a
              key={g.id}
              className={`chip ${genre === g.slug ? "active" : ""}`}
              href={buildQuery({ country, source, quality, q, sort, genre: genre === g.slug ? undefined : g.slug })}
            >
              {g.name}
            </a>
          ))}
        </div>

        <h3>Source</h3>
        <div className="chips">
          {sources.map((s) => (
            <a
              key={s.id}
              className={`chip ${source === s.id ? "active" : ""}`}
              href={buildQuery({ country, genre, quality, q, sort, source: source === s.id ? undefined : s.id })}
            >
              {s.name}
            </a>
          ))}
        </div>

        <h3>Source type</h3>
        <div className="chips">
          {SOURCE_QUALITIES.map((item) => (
            <a
              key={item.slug}
              className={`chip ${quality === item.slug ? "active" : ""}`}
              href={buildQuery({ country, genre, source, q, sort, quality: quality === item.slug ? undefined : item.slug })}
            >
              {item.label}
            </a>
          ))}
        </div>
      </aside>

      <section className="feed">
        <form className="search" action={appPath("/")} method="get">
          {country && <input type="hidden" name="country" value={country} />}
          {genre && <input type="hidden" name="genre" value={genre} />}
          {source && <input type="hidden" name="source" value={source} />}
          {quality && <input type="hidden" name="quality" value={quality} />}
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <input type="text" name="q" placeholder="Search headlines…" defaultValue={q ?? ""} />
          <button type="submit">Search</button>
        </form>

        {hasFilter && (
          <div className="active-filters" aria-label="Active filters">
            {activeCountry && (
              <a href={buildQuery({ genre, source, quality, q, sort })}>
                {flag(activeCountry)} {countryName(activeCountry)}
              </a>
            )}
            {activeGenre && (
              <a href={buildQuery({ country, source, quality, q, sort })}>{activeGenre.name}</a>
            )}
            {activeSource && (
              <a href={buildQuery({ country, genre, quality, q, sort })}>{activeSource.name}</a>
            )}
            {activeQuality && (
              <a href={buildQuery({ country, genre, source, q, sort })}>{activeQuality.label}</a>
            )}
            {q && (
              <a href={buildQuery({ country, genre, source, quality, sort })}>“{q}”</a>
            )}
          </div>
        )}

        <div className="feed-head">
          <strong>{sort === "oldest" ? "Archive" : "Latest"}</strong>
          <span className="count">
            {total} article{total === 1 ? "" : "s"} · page {page}/{totalPages}
          </span>
        </div>
        <div className="sort-tabs" aria-label="Sort articles">
          <a
            className={sort === "newest" ? "active" : ""}
            href={buildQuery({ country, genre, source, quality, q })}
          >
            Newest
          </a>
          <a
            className={sort === "oldest" ? "active" : ""}
            href={buildQuery({ country, genre, source, quality, q, sort: "oldest" })}
          >
            Oldest
          </a>
        </div>

        {articles.length === 0 ? (
          <div className="empty">
            No articles match these filters yet.
            <br />
            Run <code>npm run ingest</code> to pull in fresh news.
          </div>
        ) : (
          <ArticleFeed articles={feedArticles} />
        )}
        {totalPages > 1 && (
          <nav className="pager" aria-label="Pagination">
            <a className={page <= 1 ? "disabled" : ""} href={buildQuery({ country, genre, source, quality, q, sort, page: page > 2 ? String(page - 1) : undefined })}>
              Previous
            </a>
            <span>{page} / {totalPages}</span>
            <a className={page >= totalPages ? "disabled" : ""} href={buildQuery({ country, genre, source, quality, q, sort, page: page < totalPages ? String(page + 1) : String(totalPages) })}>
              Next
            </a>
          </nav>
        )}
      </section>
    </div>
  );
}
