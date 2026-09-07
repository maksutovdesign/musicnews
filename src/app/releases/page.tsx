import { prisma } from "@/lib/db";
import { appPath } from "@/lib/paths";
import { countryName, flag, isRealCountryCode } from "@/lib/countries";
import { ArticleFeed, type FeedArticle } from "../article-feed";
import type { Prisma } from "@prisma/client";

const MIN_CONFIDENCE = 0.6;

export const dynamic = "force-dynamic";

const FORMATS = [
  { slug: "vinyl", label: "Vinyl", keywords: ["vinyl", "12\"", "10\"", "7\"", "lp", "2lp"] },
  { slug: "cd", label: "CD", keywords: ["cd", "compact disc"] },
  { slug: "cassette", label: "Cassette", keywords: ["cassette", "tape"] },
];

type SearchParams = Promise<{
  format?: string;
  source?: string;
  q?: string;
  sort?: string;
}>;

function buildQuery(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `${appPath("/releases")}?${s}` : appPath("/releases");
}

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const source = sp.source;
  const format = FORMATS.find((item) => item.slug === sp.format);
  const sort = sp.sort === "oldest" ? "oldest" : "newest";

  const and: Prisma.ArticleWhereInput[] = [{ source: { category: "release" } }];
  if (source) and.push({ sourceId: source });
  if (q) and.push({ OR: [{ title: { contains: q } }, { summary: { contains: q } }] });
  if (format) {
    and.push({
      OR: format.keywords.flatMap((keyword) => [
        { title: { contains: keyword } },
        { summary: { contains: keyword } },
        { content: { contains: keyword } },
      ]),
    });
  }

  const where: Prisma.ArticleWhereInput = { AND: and };
  const [articles, total, sources] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: sort === "oldest" ? "asc" : "desc" },
      take: 80,
      include: {
        source: true,
        genres: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { genre: true } },
        artists: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { artist: true } },
      },
    }),
    prisma.article.count({ where }),
    prisma.source.findMany({ where: { enabled: true, category: "release" }, orderBy: { name: "asc" } }),
  ]);

  const feedArticles: FeedArticle[] = articles.map((article) => {
    const artistCountries = [
      ...new Set(article.artists.map((x) => x.artist.country).filter(Boolean) as string[]),
    ].filter(isRealCountryCode);

    return {
      id: article.id,
      title: article.title,
      url: article.url,
      summary: article.summary,
      content: article.content,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt.toISOString(),
      sourceName: article.source.name,
      countries: artistCountries.map((code) => ({
        code,
        label: countryName(code),
        flag: flag(code),
      })),
      artists: article.artists.map((x) => x.artist.name),
      genres: article.genres.map((g) => g.genre.name),
    };
  });

  const hasFilter = Boolean(format || source || q);
  const activeSource = sources.find((item) => item.id === source);

  return (
    <div className="layout">
      <aside className="filters">
        {hasFilter && <a className="reset" href={appPath("/releases")}>← reset all filters</a>}

        <h3>Format</h3>
        <div className="chips">
          {FORMATS.map((item) => (
            <a
              key={item.slug}
              className={`chip ${format?.slug === item.slug ? "active" : ""}`}
              href={buildQuery({ source, q, sort, format: format?.slug === item.slug ? undefined : item.slug })}
            >
              {item.label}
            </a>
          ))}
        </div>

        <h3>Source</h3>
        <div className="chips">
          {sources.map((item) => (
            <a
              key={item.id}
              className={`chip ${source === item.id ? "active" : ""}`}
              href={buildQuery({ format: format?.slug, q, sort, source: source === item.id ? undefined : item.id })}
            >
              {item.name}
            </a>
          ))}
        </div>
      </aside>

      <section className="feed">
        <form className="search" action={appPath("/releases")} method="get">
          {format && <input type="hidden" name="format" value={format.slug} />}
          {source && <input type="hidden" name="source" value={source} />}
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <input type="text" name="q" placeholder="Search releases..." defaultValue={q ?? ""} />
          <button type="submit">Search</button>
        </form>

        {hasFilter && (
          <div className="active-filters" aria-label="Active filters">
            {format && <a href={buildQuery({ source, q, sort })}>{format.label}</a>}
            {activeSource && <a href={buildQuery({ format: format?.slug, q, sort })}>{activeSource.name}</a>}
            {q && <a href={buildQuery({ format: format?.slug, source, sort })}>“{q}”</a>}
          </div>
        )}

        <div className="feed-head">
          <strong>Physical releases</strong>
          <span className="count">{total} release{total === 1 ? "" : "s"}</span>
        </div>
        <div className="sort-tabs" aria-label="Sort releases">
          <a className={sort === "newest" ? "active" : ""} href={buildQuery({ format: format?.slug, source, q })}>
            Newest
          </a>
          <a
            className={sort === "oldest" ? "active" : ""}
            href={buildQuery({ format: format?.slug, source, q, sort: "oldest" })}
          >
            Oldest
          </a>
        </div>

        {articles.length === 0 ? (
          <div className="empty">
            No physical releases match these filters yet.
            <br />
            Run <code>npm run ingest</code> to pull release feeds.
          </div>
        ) : (
          <ArticleFeed articles={feedArticles} />
        )}
      </section>
    </div>
  );
}
