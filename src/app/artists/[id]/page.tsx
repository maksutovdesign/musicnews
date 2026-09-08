import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { appPath } from "@/lib/paths";
import { countryName, flag, isRealCountryCode } from "@/lib/countries";
import { publicArticleWhere } from "@/lib/moderation";
import { ArticleFeed, type FeedArticle } from "../../article-feed";

const MIN_CONFIDENCE = 0.6;

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type LoadedArtist = NonNullable<Awaited<ReturnType<typeof loadArtist>>>;
type LoadedArticle = LoadedArtist["articles"][number]["article"];

function toFeedArticle(article: LoadedArticle): FeedArticle {
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
    sourceQuality: article.source.quality,
    releaseFormat: article.releaseFormat,
    releaseCountry: article.releaseCountry,
    releaseLabel: article.releaseLabel,
    releaseCatalogNumber: article.releaseCatalogNumber,
    releaseYear: article.releaseYear,
    countries: artistCountries.map((code) => ({
      code,
      label: countryName(code),
      flag: flag(code),
    })),
    artists: article.artists.map((x) => x.artist.name),
    genres: article.genres.map((g) => g.genre.name),
  };
}

async function loadArtist(id: string) {
  return prisma.artist.findUnique({
    where: { id },
    include: {
      artistGenres: {
        where: { confidence: { gte: MIN_CONFIDENCE } },
        include: { genre: true },
        orderBy: { genre: { name: "asc" } },
      },
      articles: {
        where: { article: publicArticleWhere() },
        orderBy: { article: { publishedAt: "desc" } },
        take: 80,
        include: {
          article: {
            include: {
              source: true,
              genres: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { genre: true } },
              artists: { where: { confidence: { gte: MIN_CONFIDENCE } }, include: { artist: true } },
            },
          },
        },
      },
    },
  });
}

export default async function ArtistPage({ params }: { params: Params }) {
  const { id } = await params;
  const artist = await loadArtist(id);
  if (!artist) notFound();

  const news = artist.articles
    .map((item) => item.article)
    .filter((article) => article.source.category === "news")
    .map(toFeedArticle);
  const releases = artist.articles
    .map((item) => item.article)
    .filter((article) => article.source.category === "release")
    .map(toFeedArticle);

  const musicBrainzUrl = artist.mbid
    ? `https://musicbrainz.org/artist/${artist.mbid}`
    : `https://musicbrainz.org/search?query=${encodeURIComponent(artist.name)}&type=artist`;

  return (
    <div className="artist-detail">
      <a className="reset" href={appPath("/artists")}>← all artists</a>

      <header className="detail-head">
        <div>
          <h1>{artist.name}</h1>
          <div className="meta">
            {artist.country && isRealCountryCode(artist.country) && (
              <span className="tag country">
                {flag(artist.country)} {countryName(artist.country)}
              </span>
            )}
            {artist.artistGenres.slice(0, 6).map((item) => (
              <span key={item.genreId} className="tag">{item.genre.name}</span>
            ))}
          </div>
        </div>
        <a className="source-link" href={musicBrainzUrl} target="_blank" rel="noopener noreferrer">
          MusicBrainz
        </a>
      </header>

      <section className="feed detail-section">
        <div className="feed-head">
          <strong>News</strong>
          <span className="count">{news.length} item{news.length === 1 ? "" : "s"}</span>
        </div>
        {news.length ? <ArticleFeed articles={news} /> : <div className="empty">No linked news yet.</div>}
      </section>

      <section className="feed detail-section">
        <div className="feed-head">
          <strong>Releases</strong>
          <span className="count">{releases.length} item{releases.length === 1 ? "" : "s"}</span>
        </div>
        {releases.length ? <ArticleFeed articles={releases} /> : <div className="empty">No linked releases yet.</div>}
      </section>
    </div>
  );
}
