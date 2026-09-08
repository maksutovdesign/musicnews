# MusicNews v0.3.0

Moderation and data-quality release.

## Highlights

- Added `/admin/review` for Google News review.
- Added moderation status fields to articles: published, review, blocked.
- Added block rules for domains and keywords.
- Block rules are applied during ingest, so future matching articles are skipped.
- Added `npm run moderation:backfill` to populate source domains and move Google News items into review.
- Public feeds now hide blocked articles.
- Discogs releases now store `externalProvider` and `externalId`.
- Discogs release titles in `Artist - Release` format now improve artist linking.
- Added Postgres migration notes and backup baseline in `docs/postgres-migration.md`.

## Deployment Notes

After deployment:

```bash
npm run moderation:backfill
npm run ingest
```

Production URL:

https://maksutovdesign.ru/musicnews
