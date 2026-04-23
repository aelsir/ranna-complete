#!/usr/bin/env npx tsx

/**
 * Ranna Platform — Comprehensive Backup Script
 *
 * Backs up:
 *   1. Database (all tables via Supabase API → JSON)
 *   2. R2 storage (audio + images via S3 API, incremental)
 *   3. Git repo (bundle)
 *   4. Environment secrets
 *
 * Usage:
 *   npx tsx backup.ts                  # Interactive drive selection
 *   npx tsx backup.ts --use-last       # Reuse last drive
 *   npx tsx backup.ts --dry-run        # Show what would happen
 *   npx tsx backup.ts --limit 5        # Test with 5 files per folder
 *   npx tsx backup.ts --skip-db        # Skip database backup
 *   npx tsx backup.ts --skip-r2        # Skip R2 storage backup
 *   npx tsx backup.ts --skip-repo      # Skip git bundle
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

// ── Load environment ──────────────────────────────────────────────

const envPath = path.resolve(import.meta.dirname, "../web/.env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌  web/.env.local not found. Cannot read credentials.");
  process.exit(1);
}
dotenv.config({ path: envPath });

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Missing Supabase credentials in web/.env.local");
  process.exit(1);
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("❌  Missing R2 credentials in web/.env.local");
  process.exit(1);
}

// ── Parse CLI args ────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const USE_LAST = args.includes("--use-last");
const SKIP_DB = args.includes("--skip-db");
const SKIP_R2 = args.includes("--skip-r2");
const SKIP_REPO = args.includes("--skip-repo");
const SKIP_ENV = args.includes("--skip-env");
const LIMIT = (() => {
  const idx = args.indexOf("--limit");
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : 0;
})();

// ── Constants ─────────────────────────────────────────────────────

const LAST_TARGET_FILE = path.resolve(import.meta.dirname, ".last-target");
const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MAX_DB_DUMPS = 10;

const DB_TABLES = [
  "madha",
  "madiheen",
  "ruwat",
  "turuq",
  "funun",
  "collections",
  "collection_items",
  "user_profiles",
  "user_favorites",
  "user_plays",
  "user_roles",
  "pending_imports",
  // Stripe tables (less critical but included)
  "customers",
  "products",
  "prices",
  "subscriptions",
  "checkout_sessions",
];

// ── Helpers ───────────────────────────────────────────────────────

function log(msg: string) {
  console.log(msg);
}

function logSection(title: string) {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(50)}\n`);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Step 1: Drive Selection ──────────────────────────────────────

async function selectTarget(): Promise<string> {
  // Check --use-last
  if (USE_LAST && fs.existsSync(LAST_TARGET_FILE)) {
    const last = fs.readFileSync(LAST_TARGET_FILE, "utf-8").trim();
    if (fs.existsSync(last)) {
      log(`📂  Using last target: ${last}`);
      return last;
    }
    log(`⚠️   Last target ${last} not found, selecting new one...`);
  }

  // Detect mounted external volumes (macOS)
  const volumesDir = "/Volumes";
  let volumes: { name: string; path: string; free: string }[] = [];

  if (fs.existsSync(volumesDir)) {
    const entries = fs.readdirSync(volumesDir);
    for (const entry of entries) {
      if (entry === "Macintosh HD" || entry.startsWith(".")) continue;
      const volPath = path.join(volumesDir, entry);
      try {
        const dfOut = execSync(`df -h "${volPath}" 2>/dev/null`).toString();
        const lines = dfOut.trim().split("\n");
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/);
          const free = parts[3] || "unknown";
          volumes.push({ name: entry, path: volPath, free });
        }
      } catch {
        // skip
      }
    }
  }

  console.log("\n┌─────────────────────────────────────┐");
  console.log("│   📀  Ranna Backup — Select Target   │");
  console.log("└─────────────────────────────────────┘\n");

  if (volumes.length > 0) {
    log("  External drives detected:\n");
    volumes.forEach((v, i) => {
      log(`    ${i + 1}. ${v.name}  (${v.free} free)`);
    });
    log(`    ${volumes.length + 1}. Enter custom path\n`);

    const choice = await ask("  Select [1]: ");
    const idx = choice ? parseInt(choice, 10) - 1 : 0;

    if (idx >= 0 && idx < volumes.length) {
      const target = path.join(volumes[idx].path, "ranna-backup");
      if (!DRY_RUN) {
        fs.writeFileSync(LAST_TARGET_FILE, target);
      }
      return target;
    }
  } else {
    log("  No external drives detected.\n");
  }

  const custom = await ask("  Enter backup path: ");
  if (!custom) {
    console.error("❌  No path provided. Exiting.");
    process.exit(1);
  }

  const target = custom.endsWith("ranna-backup") ? custom : path.join(custom, "ranna-backup");
  if (!DRY_RUN) {
    fs.writeFileSync(LAST_TARGET_FILE, target);
  }
  return target;
}

// ── Step 2: Database Backup ──────────────────────────────────────

async function backupDatabase(targetDir: string) {
  logSection("💾  Database Backup");

  const dbDir = path.join(targetDir, "db");
  ensureDir(dbDir);

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = timestamp();
  const dumpDir = path.join(dbDir, stamp);
  ensureDir(dumpDir);

  let totalRows = 0;
  const summary: { table: string; rows: number }[] = [];

  for (const table of DB_TABLES) {
    try {
      // First get the count
      const { count, error: countErr } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (countErr) {
        log(`  ⚠️   ${table}: ${countErr.message}`);
        summary.push({ table, rows: -1 });
        continue;
      }

      const rowCount = count || 0;

      if (DRY_RUN) {
        log(`  📋  ${table}: ${rowCount} rows`);
        summary.push({ table, rows: rowCount });
        totalRows += rowCount;
        continue;
      }

      // Fetch all data in pages of 1000
      const allRows: any[] = [];
      let offset = 0;
      const PAGE_SIZE = 1000;

      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          log(`  ⚠️   ${table}: ${error.message}`);
          break;
        }

        if (!data || data.length === 0) break;
        allRows.push(...data);
        offset += PAGE_SIZE;

        if (data.length < PAGE_SIZE) break;
      }

      const filePath = path.join(dumpDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allRows, null, 2));
      log(`  ✅  ${table}: ${allRows.length} rows → ${table}.json`);
      summary.push({ table, rows: allRows.length });
      totalRows += allRows.length;
    } catch (err) {
      log(`  ❌  ${table}: ${(err as Error).message}`);
      summary.push({ table, rows: -1 });
    }
  }

  // Write summary
  if (!DRY_RUN) {
    const summaryPath = path.join(dumpDir, "_summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify({ timestamp: stamp, tables: summary, totalRows }, null, 2));
  }

  // Clean old dumps (keep last MAX_DB_DUMPS)
  if (!DRY_RUN) {
    const dumps = fs.readdirSync(dbDir)
      .filter((d) => fs.statSync(path.join(dbDir, d)).isDirectory())
      .sort()
      .reverse();

    if (dumps.length > MAX_DB_DUMPS) {
      for (const old of dumps.slice(MAX_DB_DUMPS)) {
        fs.rmSync(path.join(dbDir, old), { recursive: true });
        log(`  🗑️   Removed old dump: ${old}`);
      }
    }
  }

  log(`\n  Total: ${totalRows} rows across ${summary.filter((s) => s.rows >= 0).length} tables`);
}

// ── Step 3: R2 Storage Backup ────────────────────────────────────

async function backupR2(targetDir: string) {
  logSection("☁️   R2 Storage Backup");

  const r2Dir = path.join(targetDir, "r2");
  ensureDir(r2Dir);

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });

  // Phase 1: List all objects in R2
  log("  📡  Listing R2 objects...");
  const allObjects: { key: string; size: number }[] = [];
  let continuationToken: string | undefined;
  let pageCount = 0;

  while (true) {
    const cmd = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME!,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });

    const resp = await s3.send(cmd);
    pageCount++;

    if (resp.Contents) {
      for (const obj of resp.Contents) {
        if (obj.Key && obj.Size !== undefined) {
          allObjects.push({ key: obj.Key, size: obj.Size });
        }
      }
    }

    process.stdout.write(`\r  📡  Listed ${allObjects.length} objects (page ${pageCount})...`);

    if (!resp.IsTruncated) break;
    continuationToken = resp.NextContinuationToken;
  }

  console.log(); // newline after progress
  log(`  📦  Total R2 objects: ${allObjects.length}`);

  const totalR2Size = allObjects.reduce((sum, o) => sum + o.size, 0);
  log(`  📦  Total R2 size: ${formatBytes(totalR2Size)}`);

  // Categorize
  const audioFiles = allObjects.filter((o) => o.key.startsWith("audio/"));
  const imageFiles = allObjects.filter((o) => o.key.startsWith("images/"));
  const otherFiles = allObjects.filter((o) => !o.key.startsWith("audio/") && !o.key.startsWith("images/"));

  log(`       Audio: ${audioFiles.length} files (${formatBytes(audioFiles.reduce((s, o) => s + o.size, 0))})`);
  log(`       Images: ${imageFiles.length} files (${formatBytes(imageFiles.reduce((s, o) => s + o.size, 0))})`);
  if (otherFiles.length > 0) {
    log(`       Other: ${otherFiles.length} files (${formatBytes(otherFiles.reduce((s, o) => s + o.size, 0))})`);
  }

  // Phase 2: Diff — find what's missing locally
  const objectsToProcess = LIMIT > 0 ? allObjects.slice(0, LIMIT) : allObjects;

  let skipped = 0;
  let downloaded = 0;
  let downloadedBytes = 0;
  let errors = 0;
  const toDownload: { key: string; size: number }[] = [];

  for (const obj of objectsToProcess) {
    const localPath = path.join(r2Dir, obj.key);
    if (fs.existsSync(localPath)) {
      // Check size matches
      const localSize = fs.statSync(localPath).size;
      if (localSize === obj.size) {
        skipped++;
        continue;
      }
    }
    toDownload.push(obj);
  }

  log(`\n  🔍  ${skipped} files already backed up, ${toDownload.length} to download`);

  if (DRY_RUN) {
    if (toDownload.length > 0) {
      const previewCount = Math.min(10, toDownload.length);
      log(`\n  Would download (showing first ${previewCount}):`);
      for (const obj of toDownload.slice(0, previewCount)) {
        log(`    → ${obj.key} (${formatBytes(obj.size)})`);
      }
      if (toDownload.length > previewCount) {
        log(`    ... and ${toDownload.length - previewCount} more`);
      }
    }
    return;
  }

  // Phase 3: Download missing files
  for (let i = 0; i < toDownload.length; i++) {
    const obj = toDownload[i];
    const localPath = path.join(r2Dir, obj.key);

    try {
      // Ensure directory exists
      ensureDir(path.dirname(localPath));

      const getCmd = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME!,
        Key: obj.key,
      });

      const resp = await s3.send(getCmd);

      if (resp.Body) {
        const writeStream = fs.createWriteStream(localPath);
        // @ts-ignore — Body is a Readable stream from AWS SDK
        await pipeline(resp.Body as Readable, writeStream);
      }

      downloaded++;
      downloadedBytes += obj.size;

      const pct = Math.round(((i + 1) / toDownload.length) * 100);
      process.stdout.write(
        `\r  ⬇️   [${i + 1}/${toDownload.length}] ${pct}% — ${obj.key.split("/").pop()} (${formatBytes(obj.size)})    `
      );
    } catch (err) {
      errors++;
      log(`\n  ❌  ${obj.key}: ${(err as Error).message}`);
    }
  }

  if (toDownload.length > 0) console.log(); // newline after progress

  log(`\n  ✅  R2 backup complete:`);
  log(`      Downloaded: ${downloaded} files (${formatBytes(downloadedBytes)})`);
  log(`      Skipped: ${skipped} files (already backed up)`);
  if (errors > 0) log(`      Errors: ${errors}`);
}

// ── Step 4: Copy Source Code ──────────────────────────────────────

function backupSourceCode(targetDir: string) {
  logSection("📦  Source Code Copy");

  // Directories to copy (excluding node_modules, dist, .env files)
  const SKIP = new Set([
    "node_modules", "dist", "dist-ssr", "dev-dist", ".claude",
    ".git", ".DS_Store", ".env.local", ".env.local.cloud", ".env.local.offline",
  ]);

  function copyDirSync(src: string, dest: string, depth = 0) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      if (entry.name.endsWith(".local")) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        count += copyDirSync(srcPath, destPath, depth + 1);
      } else {
        fs.copyFileSync(srcPath, destPath);
        count++;
      }
    }
    return count;
  }

  // Copy web/ source
  const webSrc = path.join(REPO_ROOT, "web");
  const webDest = path.join(targetDir, "web");
  if (DRY_RUN) {
    log(`  Would copy: web/ → ${webDest}`);
  } else {
    const webCount = copyDirSync(webSrc, webDest);
    log(`  ✅  web/: ${webCount} files copied`);
  }

  // Copy supabase/ config + migrations
  const supaSrc = path.join(REPO_ROOT, "supabase");
  const supaDest = path.join(targetDir, "supabase");
  if (DRY_RUN) {
    log(`  Would copy: supabase/ → ${supaDest}`);
  } else {
    const supaCount = copyDirSync(supaSrc, supaDest);
    log(`  ✅  supabase/: ${supaCount} files copied`);
  }

  // Copy restore.ts + package.json to the drive root
  const restoreSrc = path.join(import.meta.dirname, "restore.ts");
  const restoreDest = path.join(targetDir, "restore.ts");
  const pkgSrc = path.join(import.meta.dirname, "restore-package.json");
  const pkgDest = path.join(targetDir, "package.json");

  if (!DRY_RUN) {
    if (fs.existsSync(restoreSrc)) {
      fs.copyFileSync(restoreSrc, restoreDest);
      log(`  ✅  restore.ts copied to drive`);
    }
    // Write a standalone package.json for the drive
    const drivePkg = {
      name: "ranna-offline",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        restore: "npx tsx restore.ts",
        "restore:skip-db": "npx tsx restore.ts --skip-db",
        serve: "npx tsx restore.ts --skip-db",
      },
      dependencies: {
        "@supabase/supabase-js": "^2.98.0",
        tsx: "^4.19.0",
      },
    };
    fs.writeFileSync(pkgDest, JSON.stringify(drivePkg, null, 2));
    log(`  ✅  package.json written to drive`);
  } else {
    log(`  Would copy restore.ts + package.json to drive`);
  }
}

// ── Step 5: Env Files ────────────────────────────────────────────

function backupEnv(targetDir: string) {
  logSection("🔑  Environment Secrets");

  const envDir = path.join(targetDir, "env");
  ensureDir(envDir);

  const envFiles = [
    { src: path.join(REPO_ROOT, "web", ".env.local"), dest: "web.env.local" },
    { src: path.join(REPO_ROOT, "supabase", ".env.local"), dest: "supabase.env.local" },
    { src: path.join(REPO_ROOT, "supabase", ".env"), dest: "supabase.env" },
  ];

  for (const { src, dest } of envFiles) {
    if (fs.existsSync(src)) {
      if (DRY_RUN) {
        log(`  Would copy: ${src} → env/${dest}`);
      } else {
        fs.copyFileSync(src, path.join(envDir, dest));
        log(`  ✅  ${dest}`);
      }
    } else {
      log(`  ⏭️   ${dest} (source not found, skipping)`);
    }
  }
}

// ── Step 6: Log ──────────────────────────────────────────────────

function appendLog(targetDir: string, duration: number) {
  if (DRY_RUN) return;

  const logPath = path.join(targetDir, "backup.log");
  const entry = `[${new Date().toISOString()}] Backup completed in ${Math.round(duration / 1000)}s | Flags: ${[
    SKIP_DB ? "skip-db" : "db",
    SKIP_R2 ? "skip-r2" : "r2",
    SKIP_REPO ? "skip-repo" : "repo",
    SKIP_ENV ? "skip-env" : "env",
    LIMIT > 0 ? `limit=${LIMIT}` : "no-limit",
  ].join(", ")}\n`;

  fs.appendFileSync(logPath, entry);
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("\n  🕌  Ranna Platform Backup");
  console.log(`  ${DRY_RUN ? "🔍 DRY RUN — no files will be written" : "📀 Starting backup..."}`);
  if (LIMIT > 0) console.log(`  ⚠️  Limited to ${LIMIT} files per category (test mode)`);

  const startTime = Date.now();

  // Select target
  const targetDir = await selectTarget();
  log(`\n  📂  Backup target: ${targetDir}`);
  ensureDir(targetDir);

  // Run backup steps
  if (!SKIP_DB) await backupDatabase(targetDir);
  if (!SKIP_R2) await backupR2(targetDir);
  if (!SKIP_REPO) backupSourceCode(targetDir);
  if (!SKIP_ENV) backupEnv(targetDir);

  const duration = Date.now() - startTime;
  appendLog(targetDir, duration);

  logSection("🎉  Backup Complete!");
  log(`  Target: ${targetDir}`);
  log(`  Duration: ${Math.round(duration / 1000)}s`);
  if (DRY_RUN) log(`\n  This was a dry run. No files were written.`);
  log("");
}

main().catch((err) => {
  console.error("\n❌  Backup failed:", err.message);
  process.exit(1);
});
