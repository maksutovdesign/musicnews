# MusicNews v0.5.0

Free database safety release for the current Beget + SQLite setup.

## Highlights

- Added `scripts/cron-backup.sh` for daily Beget backups.
- `npm run backup:db` now writes `backups/latest.json`.
- Added `/admin/backups` with backup status, latest archive, and file inventory.
- Updated Beget cron example with the daily backup command.
- Updated deploy packaging to exclude `backups/`.
- Added `docs/beget-backup-cron.md` because Beget SSH does not expose `crontab`.

## Beget Cron

```cron
17 3 * * * /bin/bash /home/m/maksutic/maksutovdesign.ru/musicnews/scripts/cron-backup.sh >> /home/m/maksutic/maksutovdesign.ru/musicnews/backup.log 2>&1
```

Production status page:

https://maksutovdesign.ru/musicnews/admin/backups
