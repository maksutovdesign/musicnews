# MusicNews Roadmap

## Highest Impact

1. Add source quality tiers in the UI.
   - `editorial`: curated music publications.
   - `google`: broad country news search.
   - `marketplace`: Discogs/Bandcamp/store release feeds.
   - This will let users switch between clean editorial news and full global coverage.

2. Add a review queue for noisy Google News items.
   - Mark false positives.
   - Store blocked domains/keywords.
   - Improve filters over time without deleting good sources.

3. Add source health monitoring.
   - Last successful fetch.
   - Last error.
   - Number of new items in last run.
   - Auto-pause feeds with repeated 403/404/timeouts.

4. Add richer release formatting.
   - Format badges: Vinyl, CD, Cassette.
   - Country/market badge from Discogs.
   - Label, catalog number, year, genre/style.
   - Hide releases without artwork behind an optional toggle.

5. Add artist pages inside the app.
   - Artist profile.
   - Related news.
   - Related releases.
   - Country and genre metadata.
   - External links to MusicBrainz and Discogs.

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

