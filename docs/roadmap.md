# MusicNews Roadmap

## Completed in v0.2

- Source quality tiers are stored in the database and available as UI filters.
- Source health fields now track last fetch, last error, new items, and repeated failures.
- RSS/API sources with repeated 403/404/timeout-style errors auto-disable after five failures.
- Release cards now support format, country, label, year, and catalog number metadata.
- Artist cards now open internal artist pages with linked news and releases.
- News, release, and artist feeds have pagination for larger datasets.
- `/admin/sources` shows source status, quality, errors, and item counts.
- SQLite backup script added for Beget while Postgres migration remains pending.

## Completed in v0.3

- Added `/admin/review` for Google News review queue.
- Added article moderation statuses: published, review, blocked.
- Added domain/keyword block rules that apply to existing and future articles.
- Added source-domain backfill for old articles.
- Existing Google News items can now be moved into the review workflow.
- Discogs releases now keep external provider/id for future precise Discogs linking.
- Discogs-style `Artist - Release` titles now feed artist matching for better release links.
- Added Postgres migration notes with required credentials and backup baseline.

## Completed in v0.4

- Review queue now supports selecting articles and publishing/blocking them in bulk.
- Review queue now shows top waiting domains with publish/block actions for each domain.
- Release feed now has artwork filters: with artwork and missing artwork.

## Highest Impact

1. Connect production Postgres once credentials are available.

2. Add Discogs artist links to internal artist pages.

3. Add a clear/expire action for old review items.

## Data Quality

6. Improve artist matching for Cyrillic, Japanese, Korean, and Chinese names.
   - Add alternate scripts to aliases.
   - Import more known artists by country.
   - Use MusicBrainz aliases and Discogs artist IDs when available.

7. Add source-specific parsers.
   - Google News title cleanup.
   - Bandcamp artist/title cleanup.
   - Toolbox format parser.
   - Discogs country/format/label parser.

8. Add article language detection.
   - RSS language is source-level now.
   - Some global sources mix languages.

9. Add duplicate clustering.
   - Same story can arrive from Google News and editorial RSS.
   - Cluster by title similarity and artist/date.

## Product

10. Add filters for source type, country, language, and source quality.
11. Add saved filters, for example `Russian artists`, `Vinyl only`, `Metal`, `Japan`.
12. Add search suggestions for artists and sources.
13. Add pagination or infinite scroll for large feeds.
14. Add admin screen for sources and ingest status.
15. Add sitemap and SEO metadata for public discovery.

## Infrastructure

16. Move production DB from SQLite to Postgres when traffic grows.
17. Add automatic backups for the Beget database.
18. Add GitHub Actions for build/test checks.
19. Add release workflow with tags and GitHub Releases.
20. Store secrets through hosting environment settings instead of editing `.env` by SSH.
