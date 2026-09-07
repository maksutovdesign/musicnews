import { prisma } from "@/lib/db";
import { countryName, flag, isRealCountryCode } from "@/lib/countries";
import { appPath } from "@/lib/paths";
import { ArticleFeed, type FeedArticle } from "./article-feed";
import type { Prisma } from "@prisma/client";

// Minimum confidence for a genre/country match to count. Keeps low-quality
// heuristic matches out of the filtered views (classification-quality first).
const MIN_CONFIDENCE = 0.6;

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  country?: string;
  genre?: string;
  source?: string;
  q?: string;
  sort?: string;
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
  const q = sp.q?.trim();
  const sort = sp.sort === "oldest" ? "oldest" : "newest";

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
  if (q) and.push({ title: { contains: q } });
  and.push({ source: { category: "news" } });
  if (and.length) where.AND = and;

  // Fetch articles + facets in parallel.
  const [articles, total, genres, sources, artistCountries] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: sort === "oldest" ? "asc" : "desc" },
      take: 60,
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
  const hasFilter = Boolean(country || genre || source || q);
  const activeCountry = country && isRealCountryCode(country) ? country.toUpperCase() : undefined;
  const activeGenre = genres.find((g) => g.slug === genre);
  const activeSource = sources.find((s) => s.id === source);
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
              href={buildQuery({ genre, source, q, sort, country: country?.toUpperCase() === c ? undefined : c })}
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
              href={buildQuery({ country, source, q, sort, genre: genre === g.slug ? undefined : g.slug })}
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
              href={buildQuery({ country, genre, q, sort, source: source === s.id ? undefined : s.id })}
            >
              {s.name}
            </a>
          ))}
        </div>
      </aside>

      <section className="feed">
        <form className="search" action={appPath("/")} method="get">
          {country && <input type="hidden" name="country" value={country} />}
          {genre && <input type="hidden" name="genre" value={genre} />}
          {source && <input type="hidden" name="source" value={source} />}
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <input type="text" name="q" placeholder="Search headlines…" defaultValue={q ?? ""} />
          <button type="submit">Search</button>
        </form>

        {hasFilter && (
          <div className="active-filters" aria-label="Active filters">
            {activeCountry && (
              <a href={buildQuery({ genre, source, q, sort })}>
                {flag(activeCountry)} {countryName(activeCountry)}
              </a>
            )}
            {activeGenre && (
              <a href={buildQuery({ country, source, q, sort })}>{activeGenre.name}</a>
            )}
            {activeSource && (
              <a href={buildQuery({ country, genre, q, sort })}>{activeSource.name}</a>
            )}
            {q && (
              <a href={buildQuery({ country, genre, source, sort })}>“{q}”</a>
            )}
          </div>
        )}

        <div className="feed-head">
          <strong>{sort === "oldest" ? "Archive" : "Latest"}</strong>
          <span className="count">{total} article{total === 1 ? "" : "s"}</span>
        </div>
        <div className="sort-tabs" aria-label="Sort articles">
          <a
            className={sort === "newest" ? "active" : ""}
            href={buildQuery({ country, genre, source, q })}
          >
            Newest
          </a>
          <a
            className={sort === "oldest" ? "active" : ""}
            href={buildQuery({ country, genre, source, q, sort: "oldest" })}
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
      </section>
    </div>
  );
}
