# Ranna Platform — Backup & Offline Restore

## Prerequisites

| Tool | Install | Why |
|---|---|---|
| Node.js 18+ | [nodejs.org](https://nodejs.org) | Runs the scripts |
| pnpm | `npm install -g pnpm` | Package manager |
| Docker Desktop | [docker.com/desktop](https://docs.docker.com/desktop/install/mac-install/) | Required for local Supabase |
| Supabase CLI | `brew install supabase/tap/supabase` | Runs local database |

---

## Part 1: Backup (Cloud → External Drive)

This copies everything from the cloud to your external drive.

### First time setup

```bash
cd /Users/aelsir/Documents/projects/Ranna/ranna-complete/backup
pnpm install
```

### Run the backup

```bash
cd /Users/aelsir/Documents/projects/Ranna/ranna-complete/backup
npx tsx backup.ts
```

Pick your external drive when prompted. The script:
1. Exports all database tables as JSON
2. Downloads all audio + image files from R2 (incremental — skips existing)
3. Copies the web app source code to the drive
4. Copies supabase config + migrations to the drive
5. Copies restore.ts to the drive (so the drive is self-contained)

**First backup** downloads ~7GB. **After that**, only new files are downloaded.

### Backup shortcuts

```bash
npx tsx backup.ts --use-last       # Skip drive prompt
npx tsx backup.ts --dry-run        # Preview only
npx tsx backup.ts --limit 5        # Test with 5 files
npx tsx backup.ts --skip-r2        # Fast: DB + code only
```

### What ends up on the drive

```
/Volumes/YourDrive/ranna-backup/
├── restore.ts          ← Run this to start everything
├── package.json        ← Dependencies for restore
├── web/                ← Full web app source code
│   ├── src/
│   ├── package.json
│   └── ...
├── supabase/           ← Config + migrations
│   ├── config.toml
│   └── migrations/
├── db/                 ← Database dumps (JSON)
│   └── 2026-03-20T.../
│       ├── madha.json
│       ├── madiheen.json
│       └── ...
├── r2/                 ← All audio + images
│   ├── audio/
│   └── images/
└── env/                ← Secrets backup
```

---

## Part 2: Run Offline from the Drive

**Your ranna-complete folder is never touched.** Everything runs from the drive.

### Step 1: Open Docker Desktop

Wait until it shows "Running" (whale icon stops animating).

### Step 2: Open Terminal and go to the drive

```bash
cd /Volumes/YourDrive/ranna-backup
```

### Step 3: Install restore dependencies (first time only)

```bash
npm install
```

### Step 4: Run the restore

```bash
npx tsx restore.ts
```

This will:
1. ✅ Start local Supabase (PostgreSQL via Docker)
2. ✅ Import all database tables
3. ✅ Generate `web/.env.local` on the drive (pointing to localhost)
4. ✅ Install web dependencies (first time)
5. ✅ Start file server for audio + images on port 3001

**Keep this terminal running** — it serves your audio/image files.

### Step 5: Open a NEW terminal tab and start the web app

```bash
cd /Volumes/YourDrive/ranna-backup/web
pnpm dev
```

### Step 6: Open the app

Go to **http://localhost:5173**

Everything works offline. Tracks play from the drive. Images load from the drive. Database is local.

### Next time (DB already imported)

```bash
cd /Volumes/YourDrive/ranna-backup
npx tsx restore.ts --skip-db
```

This skips the DB import (it persists between runs) and just starts the file server.

---

## Switching Back to Cloud

Nothing to do — your `ranna-complete` folder was never modified. Just use it normally:

```bash
cd /Users/aelsir/Documents/projects/Ranna/ranna-complete/web
pnpm dev
```

This uses your original `.env.local` which still points to Supabase + Cloudflare.

---

## Troubleshooting

### "Docker daemon is not running"
Open Docker Desktop and wait for it to fully start.

### "Supabase CLI not found"
```bash
brew install supabase/tap/supabase
```

### Tracks don't show up
The restore script imports the DB — check the terminal output for errors. If tables already exist, run with `--skip-db` flag.

### Audio doesn't play
Make sure the restore terminal is still running (it serves files on port 3001).

### "pnpm: command not found"
```bash
npm install -g pnpm
```
