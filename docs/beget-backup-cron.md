# Beget SQLite Backup Cron

Beget shared hosting does not expose `crontab` in this SSH shell, so the backup schedule must be added through the Beget control panel task scheduler.

## Command

Use a custom command:

```bash
/bin/bash /home/m/maksutic/maksutovdesign.ru/musicnews/scripts/cron-backup.sh >> /home/m/maksutic/maksutovdesign.ru/musicnews/backup.log 2>&1
```

## Schedule

Run once per day, for example:

```cron
17 3 * * *
```

The backup script keeps compressed SQLite copies in:

```text
/home/m/maksutic/maksutovdesign.ru/musicnews/backups
```

It also writes latest status to:

```text
/home/m/maksutic/maksutovdesign.ru/musicnews/backups/latest.json
```

Status page:

https://maksutovdesign.ru/musicnews/admin/backups
