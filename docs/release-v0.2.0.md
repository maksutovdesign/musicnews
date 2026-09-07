# MusicNews v0.2.0

Roadmap implementation release for the live Beget deployment.

## Highlights

- Added source quality tiers: editorial, Google News, marketplace, API.
- Added source quality filters to news and release feeds.
- Added source health tracking: last fetch, last error, error count, and new items from the last run.
- Added automatic disabling for feeds that repeatedly return 403/404/timeout-style errors.
- Added `/admin/sources` for source status, errors, article counts, and quality overview.
- Added structured release metadata for format, country, label, year, and catalog number.
- Added internal artist pages with linked news and physical releases.
- Added pagination for news, releases, and artist catalog.
- Added `npm run backup:db` for SQLite backups on Beget while Postgres migration is pending.

## Production Check

- Production URL: https://maksutovdesign.ru/musicnews
- Admin sources: https://maksutovdesign.ru/musicnews/admin/sources
- Production build passed locally and on Beget.
- Post-deploy ingest completed successfully.

## Current Production Data After Ingest

- 2,293 news articles.
- 1,905 physical releases.
- 1,807 releases with artwork.
- 1,510 releases with structured metadata.
- 167 configured sources across editorial RSS, Google News country feeds, Discogs API feeds, and marketplace/release feeds.
