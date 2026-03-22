#!/usr/bin/env npx tsx

/**
 * Ranna Platform — Offline Restore
 *
 * This script runs FROM the external drive. It:
 *   1. Starts local Supabase (PostgreSQL via Docker)
 *   2. Imports database from JSON backups
 *   3. Starts a file server for audio/images on port 3001
 *   4. Generates .env.local for the web app
 *   5. Installs web dependencies if needed
 *
 * Everything happens on the drive — nothing changes on your main machine.
 *
 * Usage (from the drive):
 *   cd /Volumes/YourDrive/ranna-backup
 *   npx tsx restore.ts              # Full restore
 *   npx tsx restore.ts --skip-db    # Skip DB import (already done)
 *   npx tsx restore.ts --serve      # Just start file server (DB already imported)
 */

import fs from "fs";
import path from "path";
import http from "http";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// ── Paths — everything relative to this script (on the drive) ────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DRIVE_ROOT = __dirname;  // e.g., /Volumes/Al-Lahlum/ranna-backup
const DB_DIR = path.join(DRIVE_ROOT, "db");
const R2_DIR = path.join(DRIVE_ROOT, "r2");
const WEB_DIR = path.join(DRIVE_ROOT, "web");
const SUPA_DIR = path.join(DRIVE_ROOT, "supabase");

// ── Parse CLI args ────────────────────────────────────────────────

const args = process.argv.slice(2);
const SKIP_DB = args.includes("--skip-db") || args.includes("--serve");
const SERVE_ONLY = args.includes("--serve");
const FILE_SERVER_PORT = 3001;

// ── Table config (import order, conflict keys, columns to strip) ──

const TABLES: {
  name: string;
  onConflict: string;
  stripColumns?: string[];
  clearFirst?: boolean;
}[] = [
  { name: "turuq", onConflict: "id", clearFirst: true },
  { name: "funun", onConflict: "id", clearFirst: true },
  { name: "madiheen", onConflict: "id", stripColumns: ["created_by", "reviewed_by"] },
  { name: "ruwat", onConflict: "id", stripColumns: ["created_by", "reviewed_by"] },
  { name: "madha", onConflict: "id", stripColumns: ["user_id", "reviewed_by"] },
  { name: "collections", onConflict: "id", stripColumns: ["user_id"] },
  { name: "collection_items", onConflict: "collection_id,madha_id", stripColumns: [] },
  { name: "play_events", onConflict: "id", stripColumns: ["user_id"] },
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

// ── Verify drive structure ────────────────────────────────────────

function verify() {
  logSection("📂  Verifying Backup");

  const checks = [
    { path: DB_DIR, label: "db/" },
    { path: R2_DIR, label: "r2/" },
    { path: WEB_DIR, label: "web/" },
    { path: SUPA_DIR, label: "supabase/" },
  ];

  let ok = true;
  for (const { path: p, label } of checks) {
    if (fs.existsSync(p)) {
      log(`  ✅  ${label} found`);
    } else {
      log(`  ❌  ${label} missing`);
      ok = false;
    }
  }

  if (!ok) {
    console.error("\n  Run backup.ts first to populate the drive.");
    process.exit(1);
  }

  // Find latest DB dump
  const dumps = fs.readdirSync(DB_DIR)
    .filter((d) => {
      const full = path.join(DB_DIR, d);
      return fs.statSync(full).isDirectory() && !d.startsWith(".");
    })
    .sort()
    .reverse();

  if (dumps.length === 0 && !SKIP_DB) {
    console.error("  ❌  No database dumps found in db/");
    process.exit(1);
  }

  if (dumps.length > 0) {
    log(`  ✅  Latest dump: ${dumps[0]}`);
  }

  return dumps[0] || "";
}

// ── Start local Supabase ──────────────────────────────────────────

interface SupabaseInfo {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

function findSupabaseCli(): string {
  for (const cmd of ["supabase", "npx supabase"]) {
    try {
      execSync(`${cmd} --version`, { stdio: "pipe" });
      return cmd;
    } catch { /* try next */ }
  }
  console.error("❌  Supabase CLI not found.");
  console.error("    Install: brew install supabase/tap/supabase");
  process.exit(1);
}

function startSupabase(): SupabaseInfo {
  logSection("🚀  Starting Local Supabase");

  const cli = findSupabaseCli();
  log(`  CLI: ${cli}`);

  // supabase needs config.toml — run from the supabase/ parent dir
  const supabaseWorkdir = DRIVE_ROOT; // has supabase/ folder

  let statusOutput: string;
  try {
    statusOutput = execSync(`${cli} status`, { cwd: supabaseWorkdir, stdio: "pipe" }).toString();
    log("  ✅  Already running");
  } catch {
    log("  Starting (first run takes ~1 min for Docker images)...\n");
    try {
      execSync(`${cli} start`, { cwd: supabaseWorkdir, stdio: "inherit", timeout: 300000 });
      statusOutput = execSync(`${cli} status`, { cwd: supabaseWorkdir, stdio: "pipe" }).toString();
    } catch (err) {
      console.error("\n❌  Failed to start Supabase. Is Docker Desktop running?");
      process.exit(1);
    }
  }

  // Parse keys from status output (handles new CLI table format)
  const lines = statusOutput.split("\n");
  let info: SupabaseInfo = { apiUrl: "http://127.0.0.1:54321", anonKey: "", serviceRoleKey: "" };

  for (const line of lines) {
    const clean = line.replace(/\x1b\[[0-9;]*m/g, "").replace(/[│╭╮╰╯├┤┬┴─]/g, " ").trim();

    if (clean.match(/Project URL/i)) {
      const m = clean.match(/(https?:\/\/[^\s]+)/);
      if (m) info.apiUrl = m[1];
    }
    if (clean.match(/API URL/i)) {
      const m = clean.match(/(https?:\/\/[^\s]+)/);
      if (m) info.apiUrl = m[1];
    }
    if (clean.match(/Publishable/i) && clean.match(/sb_publishable_/)) {
      const m = clean.match(/(sb_publishable_\S+)/);
      if (m) info.anonKey = m[1];
    }
    if (clean.match(/anon key/i)) {
      const m = clean.match(/(eyJ\S+|sb_\S+)/);
      if (m) info.anonKey = m[1];
    }
    if (clean.match(/^\s*Secret\s/i) || clean.match(/Secret\s+sb_secret/i)) {
      const m = clean.match(/(sb_secret_\S+)/);
      if (m) info.serviceRoleKey = m[1];
    }
    if (clean.match(/service_role key/i)) {
      const m = clean.match(/(eyJ\S+|sb_\S+)/);
      if (m) info.serviceRoleKey = m[1];
    }
  }

  if (!info.anonKey || !info.serviceRoleKey) {
    log("\n  ⚠️  Could not auto-detect keys. Raw output:");
    log(statusOutput);
    console.error("❌  Copy the Publishable and Secret keys manually.");
    process.exit(1);
  }

  log(`  API: ${info.apiUrl}`);
  log(`  Key: ${info.anonKey.slice(0, 25)}...`);
  return info;
}

// ── Import database ───────────────────────────────────────────────

async function importDatabase(dumpName: string, supaInfo: SupabaseInfo) {
  logSection("💾  Importing Database");

  const dumpDir = path.join(DB_DIR, dumpName);
  log(`  Dump: ${dumpName}\n`);

  const supabase = createClient(supaInfo.apiUrl, supaInfo.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let totalImported = 0;

  for (const tableConf of TABLES) {
    const { name: table, onConflict, stripColumns, clearFirst } = tableConf;
    const jsonPath = path.join(dumpDir, `${table}.json`);
    if (!fs.existsSync(jsonPath)) {
      log(`  ⏭️   ${table}: no file`);
      continue;
    }

    let data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    if (!Array.isArray(data) || data.length === 0) {
      log(`  ⏭️   ${table}: empty`);
      continue;
    }

    // Clear seeded data first (turuq/funun have different UUIDs from migration seeds)
    if (clearFirst) {
      await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // Strip columns that reference auth.users (doesn't exist locally)
    if (stripColumns && stripColumns.length > 0) {
      data = data.map((row: any) => {
        const cleaned = { ...row };
        for (const col of stripColumns) {
          delete cleaned[col];
        }
        return cleaned;
      });
    }

    // Upsert in batches
    const BATCH = 100;
    let imported = 0;
    let lastError = "";

    for (let i = 0; i < data.length; i += BATCH) {
      const batch = data.slice(i, i + BATCH);
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict, ignoreDuplicates: true });
      if (error) {
        lastError = error.message;
      } else {
        imported += batch.length;
      }
    }

    if (imported > 0) {
      log(`  ✅  ${table}: ${imported} rows`);
      totalImported += imported;
    }
    if (lastError) {
      log(`  ⚠️   ${table}: ${lastError}`);
    }
  }

  log(`\n  Total: ${totalImported} rows imported`);
}

// ── File server for audio + images ────────────────────────────────

function startFileServer(): http.Server {
  logSection("📡  File Server (audio + images)");

  const mimeTypes: Record<string, string> = {
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif",
  };

  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const urlPath = decodeURIComponent(req.url || "/");
    const filePath = path.join(R2_DIR, urlPath);

    if (!filePath.startsWith(R2_DIR)) { res.writeHead(403); res.end(); return; }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end("Not Found"); return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const stat = fs.statSync(filePath);

    // Range request support (audio seeking)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": contentType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      log(`  ⚠️  Port ${FILE_SERVER_PORT} already in use (previous restore still running?)`);
      log(`  ℹ️  Files are already being served at http://localhost:${FILE_SERVER_PORT}`);
    } else {
      log(`  ❌  File server error: ${err.message}`);
    }
  });

  server.listen(FILE_SERVER_PORT, () => {
    log(`  ✅  http://localhost:${FILE_SERVER_PORT}`);
    log(`  📂  Serving: ${R2_DIR}`);
  });

  return server;
}

// ── Generate .env.local for the web app on the drive ──────────────

function generateEnv(supaInfo: SupabaseInfo) {
  logSection("🔑  Generating web/.env.local");

  const content = `# Ranna Offline — Generated ${new Date().toISOString()}
NEXT_PUBLIC_SUPABASE_URL=${supaInfo.apiUrl}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${supaInfo.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${supaInfo.serviceRoleKey}
R2_PUBLIC_URL=http://localhost:${FILE_SERVER_PORT}
NEXT_PUBLIC_R2_PUBLIC_URL=http://localhost:${FILE_SERVER_PORT}
`;

  const envPath = path.join(WEB_DIR, ".env.local");
  fs.writeFileSync(envPath, content);
  log(`  ✅  Written: web/.env.local`);
}

// ── Install web dependencies if needed ────────────────────────────

function installWebDeps() {
  const nodeModules = path.join(WEB_DIR, "node_modules");
  if (fs.existsSync(nodeModules)) {
    log("  ✅  node_modules already exists");
    return;
  }

  logSection("📦  Installing Web Dependencies");
  log("  Running pnpm install (first time only)...\n");

  try {
    execSync("pnpm install", { cwd: WEB_DIR, stdio: "inherit", timeout: 120000 });
    log("\n  ✅  Dependencies installed");
  } catch {
    log("\n  ⚠️  pnpm install failed. Try manually: cd web && pnpm install");
  }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("\n  🕌  Ranna Platform — Offline Restore");
  console.log(`  📂  Running from: ${DRIVE_ROOT}\n`);

  // Verify
  const latestDump = verify();

  // Start Supabase
  const supaInfo = startSupabase();

  // Import DB
  if (!SKIP_DB && latestDump) {
    await importDatabase(latestDump, supaInfo);
  } else if (SKIP_DB) {
    log("\n  ⏭️   Skipping DB import");
  }

  // Generate env for the drive's web app
  generateEnv(supaInfo);

  // Install deps
  installWebDeps();

  // Start file server
  const server = startFileServer();

  // Done!
  logSection("🎉  Ready!");
  log("  Open a NEW terminal and run:\n");
  log(`    cd ${WEB_DIR}`);
  log("    pnpm dev\n");
  log("  Then open: http://localhost:5173\n");
  log("  Keep this terminal running (file server).");
  log("  Press Ctrl+C to stop.\n");

  process.on("SIGINT", () => {
    log("\n  Shutting down...");
    server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("\n❌  Restore failed:", err.message);
  process.exit(1);
});
