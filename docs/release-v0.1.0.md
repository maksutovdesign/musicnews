# MusicNews v0.1.0

Global music news and physical release aggregator for maksutovdesign.ru/musicnews.

## Highlights

- Added a production-ready Next.js app deployed under `/musicnews` on Beget.
- Added separate feeds for music news, physical releases, and artist catalog.
- Added automatic RSS/Discogs ingestion with cron-safe deduplication.
- Added an in-app article modal with title, text, image, tags, and source link.
- Added a real MusicNews logo using the provided app icon.
- Added automatic release artwork fallback from source pages when RSS has no image.
- Added a large MusicBrainz-based artist catalog with country, aliases, and genres.
- Added searchable artist catalog by name, sort name, and aliases.
- Added Discogs token support for vinyl, CD, and cassette release feeds.
- Added Google News Music country feeds for global coverage.

## Current Production Coverage

- 167 active sources.
- 47 Google News country feeds.
- 63 Discogs release feeds.
- 20 Discogs countries across Vinyl, CD, and Cassette formats.
- Editorial/music RSS sources including Pitchfork, NME, Stereogum, Resident Advisor, The Quietus, AllMusic, NPR All Songs Considered, Metal Injection, LouderSound, The FADER, XLR8R, Blabbermouth, MetalSucks, DJ Mag, and more.
- Release feeds from Bandcamp, Toolbox Records, Timewarp Records, and Discogs.

## Reliability

- RSS ingestion is idempotent by URL and dedupe hash.
- Invalid RSS dates no longer crash ingestion.
- Discogs missing artwork placeholders are ignored.
- MusicBrainz lookups can be disabled on Beget cron via `MUSICBRAINZ_LOOKUP=0`.
- Beget deploy excludes local database files and preserves production data.

## Deployment

Production URL:

https://maksutovdesign.ru/musicnews

