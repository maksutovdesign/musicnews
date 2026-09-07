"use client";

import { useEffect, useState } from "react";

export interface FeedArticle {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  publishedAt: string;
  sourceName: string;
  sourceQuality?: string;
  releaseFormat?: string | null;
  releaseCountry?: string | null;
  releaseLabel?: string | null;
  releaseCatalogNumber?: string | null;
  releaseYear?: number | null;
  countries: { code: string; label: string; flag: string }[];
  artists: string[];
  genres: string[];
}

interface ArticleFeedProps {
  articles: FeedArticle[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function articleParagraph(article: FeedArticle) {
  return article.content ?? article.summary ?? "Краткое описание пока не загружено.";
}

function qualityLabel(value: string | undefined) {
  switch (value) {
    case "google":
      return "Google News";
    case "marketplace":
      return "Marketplace";
    case "api":
      return "API";
    default:
      return "Editorial";
  }
}

function releaseTags(article: FeedArticle) {
  return [
    article.releaseFormat,
    article.releaseCountry,
    article.releaseLabel,
    article.releaseYear ? String(article.releaseYear) : null,
    article.releaseCatalogNumber,
  ].filter((value): value is string => Boolean(value));
}

export function ArticleFeed({ articles }: ArticleFeedProps) {
  const [selected, setSelected] = useState<FeedArticle | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  return (
    <>
      {articles.map((article) => (
        <button
          key={article.id}
          type="button"
          className={`card article-button ${article.imageUrl ? "" : "no-img"}`}
          onClick={() => setSelected(article)}
        >
          {article.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="thumb" src={article.imageUrl} alt="" loading="lazy" />
          )}
          <div>
            <h2>{article.title}</h2>
            {article.summary && <p className="summary">{article.summary}</p>}
            <div className="meta">
              <span className="tag">{article.sourceName}</span>
              {article.sourceQuality && <span className="tag">{qualityLabel(article.sourceQuality)}</span>}
              <span className="dot">·</span>
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
              {releaseTags(article).map((tag) => (
                <span key={tag} className="tag release-tag">{tag}</span>
              ))}
              {article.countries.map((country) => (
                <span key={country.code} className="tag country">
                  {country.flag} {country.label}
                </span>
              ))}
              {article.artists.slice(0, 5).map((artist) => (
                <span key={artist} className="tag artist">{artist}</span>
              ))}
              {article.genres.slice(0, 3).map((genre) => (
                <span key={genre} className="tag">{genre}</span>
              ))}
            </div>
          </div>
        </button>
      ))}

      {selected && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <article className="article-modal" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
            <div className="modal-top">
              <div className="modal-meta">
                <span className="tag">{selected.sourceName}</span>
                {selected.sourceQuality && <span className="tag">{qualityLabel(selected.sourceQuality)}</span>}
                <time dateTime={selected.publishedAt}>{formatDate(selected.publishedAt)}</time>
              </div>
              <button className="close-button" type="button" onClick={() => setSelected(null)} aria-label="Закрыть">
                ×
              </button>
            </div>

            {selected.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="modal-image" src={selected.imageUrl} alt="" />
            )}

            <h1 id="article-modal-title">{selected.title}</h1>
            <p>{articleParagraph(selected)}</p>

            <div className="meta modal-tags">
              {selected.countries.map((country) => (
                <span key={country.code} className="tag country">
                  {country.flag} {country.label}
                </span>
              ))}
              {selected.artists.map((artist) => (
                <span key={artist} className="tag artist">{artist}</span>
              ))}
              {selected.genres.map((genre) => (
                <span key={genre} className="tag">{genre}</span>
              ))}
              {releaseTags(selected).map((tag) => (
                <span key={tag} className="tag release-tag">{tag}</span>
              ))}
            </div>

            <div className="modal-actions">
              <a className="source-link" href={selected.url} target="_blank" rel="noopener noreferrer">
                Открыть источник
              </a>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
