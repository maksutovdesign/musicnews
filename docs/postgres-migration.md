# Postgres Migration Notes

MusicNews is still running on SQLite on Beget. That is acceptable for the current MVP, but Postgres is the right next database once ingest volume and admin edits grow.

## Required Inputs

- Postgres host.
- Database name.
- Database user.
- Database password.
- SSL mode required by the provider.

## Prisma Change

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Set `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
```

Then run:

```bash
npm install
npx prisma db push
npm run seed
npm run import:artists -- --popular
npm run ingest
```

## Backup Baseline

Until Postgres is connected, Beget can back up SQLite with:

```bash
cd /home/m/maksutic/maksutovdesign.ru/musicnews
PATH=/home/m/maksutic/maksutovdesign.ru/.local/bin:$PATH npm run backup:db
```

For Postgres, use provider-managed daily backups first. If that is unavailable, add a cron command with `pg_dump` and keep at least 14 daily snapshots.
