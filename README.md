# MusicNews

Global music news aggregator. Pulls news from music outlets' RSS feeds, resolves
the artists mentioned against **MusicBrainz**, and derives each article's
**country** (from the artist) and **genre** — so the feed is sortable by country,
genre and source.

Built with **Next.js + TypeScript + Prisma**. Uses **SQLite** for zero-setup
local dev; switch to Postgres for production by changing the provider in
`prisma/schema.prisma`.

## Quick start

```bash
npm install
npx prisma db push     # create the SQLite schema
npm run seed           # load the genre taxonomy
npm run ingest         # fetch + classify news (slow first run: MusicBrainz is rate-limited)
npm run ingest:watch   # keep polling RSS feeds every 15 minutes
npm run dev            # http://localhost:3000
```

## How classification works

```
RSS item
  → extract candidate artist names from the headline (heuristic NER)
  → resolve each name against MusicBrainz  → MBID, country, genre tags
  → normalize raw tags to a canonical genre taxonomy (src/lib/genres.ts)
  → attach country + genres to the article, each with a confidence score
```

Filters only surface matches above a confidence threshold (`MIN_CONFIDENCE`),
so low-quality guesses stay out of the sorted views.

Headlines are written in Title Case, which defeats a naive "capitalized words
= name" heuristic — words like "Manager", "Live" or "Various Artists" are
real (if obscure/placeholder) MusicBrainz entities, so score-based filtering
alone doesn't catch them. `src/ingest/common-words.ts` blocklists common
English/headline vocabulary and known MusicBrainz placeholder MBIDs before
they ever reach a lookup.

## Project layout

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Data model (Article, Artist, Genre, Source + links) |
| `src/lib/genres.ts` | Canonical genre taxonomy + tag normalization |
| `src/lib/musicbrainz.ts` | Rate-limited MusicBrainz client |
| `src/lib/countries.ts` | ISO code → name + flag |
| `src/ingest/sources.ts` | RSS feed list (extend to add coverage) |
| `src/ingest/rss.ts` | Feed fetch/parse + dedup |
| `src/ingest/common-words.ts` | Blocklist that keeps generic headline words out of artist extraction |
| `src/ingest/classify.ts` | Artist extraction → country/genre pipeline |
| `src/ingest/run.ts` | One ingestion pass (run on a cron) |
| `src/ingest/reclassify.ts` | Re-run classification over already-stored articles (`--only-unclassified` to skip ones that already matched) |
| `src/ingest/cleanup.ts` | Remove junk Artist rows that predate a classifier fix |
| `src/app/page.tsx` | Feed UI with country/genre/source filters |
| `src/app/api/articles/route.ts` | JSON feed for future clients |

## Scheduling

`npm run ingest` is idempotent — run it on a cron (every 15–30 min) to keep the
feed fresh.

For local development, keep a watcher running in a separate terminal:

```bash
npm run ingest:watch
```

Use a custom interval in minutes when needed:

```bash
npm run ingest:watch -- --interval=5
```

## Beget deployment

For `https://maksutovdesign.ru/musicnews`, build the app with a base path:

```bash
cp .env.production.example .env.production
npm install
npx prisma db push
npm run seed
NEXT_PUBLIC_BASE_PATH=/musicnews npm run build
NODE_ENV=production NEXT_PUBLIC_BASE_PATH=/musicnews node server.js
```

On Beget shared hosting, run Node.js from the Docker environment and use
Passenger with `server.js` as the startup file. A typical `.htaccess` near the
app root contains:

```apache
PassengerNodejs /home/m/maksutic/maksutovdesign.ru/.local/bin/node
PassengerAppRoot /home/m/maksutic/maksutovdesign.ru/musicnews
PassengerAppType node
PassengerStartupFile server.js
PassengerBaseURI /musicnews
SetEnv NODE_ENV production
SetEnv NEXT_PUBLIC_BASE_PATH /musicnews
SetEnv DATABASE_URL file:./dev.db
```

Then add a CronTab task every 15 minutes:

```cron
*/15 * * * * /bin/bash /home/m/maksutic/maksutovdesign.ru/musicnews/scripts/cron-ingest.sh >> /home/m/maksutic/maksutovdesign.ru/musicnews/ingest.log 2>&1
```

## Maintenance

If you tighten the classifier (new stopwords, confidence rules, genre
mappings), reclassify existing data instead of waiting for new articles:

```bash
npm run cleanup      # drop Artist rows the new rules would now reject
npm run reclassify   # re-run classifyArticle over all stored articles
```

## Roadmap (see the plan)

- API sources: YouTube Data, Spotify, NewsAPI
- LLM fallback classifier for ambiguous headlines
- Per-artist / per-country / per-genre pages, i18n
- Selective, licensed social-media sources
