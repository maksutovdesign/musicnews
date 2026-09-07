import { prisma } from "@/lib/db";
import { countryName, flag, isRealCountryCode } from "@/lib/countries";
import { appPath } from "@/lib/paths";
import type { Prisma } from "@prisma/client";

const MIN_CONFIDENCE = 0.6;
const PAGE_SIZE = 120;

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  country?: string;
  genre?: string;
  q?: string;
  page?: string;
}>;

function buildQuery(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `${appPath("/artists")}?${s}` : appPath("/artists");
}

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const country = sp.country?.toUpperCase();
  const genre = sp.genre;
  const q = sp.q?.trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ArtistWhereInput = {};
  const and: Prisma.ArtistWhereInput[] = [];

  if (country && isRealCountryCode(country)) and.push({ country });
  if (genre) {
    and.push({
      artistGenres: {
        some: { confidence: { gte: MIN_CONFIDENCE }, genre: { slug: genre } },
      },
    });
  }
  if (q) {
    and.push({
      OR: [
        { name: { contains: q } },
        { sortName: { contains: q } },
        { aliases: { contains: q } },
      ],
    });
  }
  if (and.length) where.AND = and;

  const [artists, total, genres, artistCountries] = await Promise.all([
    prisma.artist.findMany({
      where,
      orderBy: [{ sortName: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        artistGenres: {
          where: { confidence: { gte: MIN_CONFIDENCE } },
          include: { genre: true },
          orderBy: { genre: { name: "asc" } },
        },
        _count: { select: { articles: true } },
      },
    }),
    prisma.artist.count({ where }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.artist.findMany({
      where: { country: { not: null } },
      select: { country: true },
      distinct: ["country"],
    }),
  ]);

  const countries = [
    ...new Set(artistCountries.map((a) => a.country!).filter(Boolean)),
  ]
    .filter(isRealCountryCode)
    .sort();
  const activeGenre = genres.find((g) => g.slug === genre);
  const hasFilter = Boolean(country || genre || q);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="layout">
      <aside className="filters">
        {hasFilter && <a className="reset" href={appPath("/artists")}>← reset all filters</a>}

        <h3>Country</h3>
        <div className="chips">
          {countries.map((c) => (
            <a
              key={c}
              className={`chip ${country === c ? "active" : ""}`}
              href={buildQuery({ genre, q, country: country === c ? undefined : c })}
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
              href={buildQuery({ country, q, genre: genre === g.slug ? undefined : g.slug })}
            >
              {g.name}
            </a>
          ))}
        </div>
      </aside>

      <section className="feed">
        <form className="search" action={appPath("/artists")} method="get">
          {country && <input type="hidden" name="country" value={country} />}
          {genre && <input type="hidden" name="genre" value={genre} />}
          <input type="text" name="q" placeholder="Search artists..." defaultValue={q ?? ""} />
          <button type="submit">Search</button>
        </form>

        {hasFilter && (
          <div className="active-filters" aria-label="Active filters">
            {country && isRealCountryCode(country) && (
              <a href={buildQuery({ genre, q })}>
                {flag(country)} {countryName(country)}
              </a>
            )}
            {activeGenre && <a href={buildQuery({ country, q })}>{activeGenre.name}</a>}
            {q && <a href={buildQuery({ country, genre })}>“{q}”</a>}
          </div>
        )}

        <div className="feed-head">
          <strong>Artist catalog</strong>
          <span className="count">
            {total} artist{total === 1 ? "" : "s"} · page {page}/{totalPages}
          </span>
        </div>

        {artists.length === 0 ? (
          <div className="empty">
            No artists match these filters yet.
            <br />
            Run <code>npm run import:artists</code> to grow the catalog.
          </div>
        ) : (
          <div className="artist-grid">
            {artists.map((artist) => (
              <a
                key={artist.id}
                className="artist-card"
                href={appPath(`/artists/${artist.id}`)}
              >
                <h2>{artist.name}</h2>
                <div className="meta">
                  {artist.country && isRealCountryCode(artist.country) && (
                    <span className="tag country">
                      {flag(artist.country)} {countryName(artist.country)}
                    </span>
                  )}
                  <span className="tag">{artist._count.articles} news</span>
                </div>
                <div className="meta">
                  {artist.artistGenres.slice(0, 4).map((g) => (
                    <span key={g.genreId} className="tag">{g.genre.name}</span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <nav className="pager" aria-label="Pagination">
            <a className={page <= 1 ? "disabled" : ""} href={buildQuery({ country, genre, q, page: page > 2 ? String(page - 1) : undefined })}>
              Previous
            </a>
            <span>{page} / {totalPages}</span>
            <a className={page >= totalPages ? "disabled" : ""} href={buildQuery({ country, genre, q, page: page < totalPages ? String(page + 1) : String(totalPages) })}>
              Next
            </a>
          </nav>
        )}
      </section>
    </div>
  );
}
