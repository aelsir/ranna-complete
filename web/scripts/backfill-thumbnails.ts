/**
 * Backfill script: Generate thumbnails for existing images.
 *
 * For every track/artist/narrator that has an image_url but no thumbnail_url,
 * this script:
 * 1. Downloads the original image from R2
 * 2. Generates a 150x150 WebP thumbnail using sharp
 * 3. Uploads the thumbnail to R2
 * 4. Updates the database record with the thumbnail_url
 *
 * Usage:
 *   npx tsx scripts/backfill-thumbnails.ts [--limit 10] [--table tracks]
 *
 * Requires:
 *   - .env.local with R2_* and SUPABASE_* credentials
 *   - sharp installed (pnpm add sharp)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // Also load .env as fallback
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "ranna";
const R2_URL = process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL || "";
const THUMB_SIZE = 150;
const THUMB_QUALITY = 60;

// Parse CLI args
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0;
const tableIdx = args.indexOf("--table");
const tableFilter = tableIdx >= 0 ? args[tableIdx + 1] : "all";

async function downloadFromR2(key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

async function uploadThumb(originalKey: string, thumbBuffer: Buffer): Promise<string> {
  const nameWithoutExt = originalKey.replace(/\.[^.]+$/, "");
  const thumbKey = `${nameWithoutExt}-thumb.webp`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: thumbKey,
      Body: thumbBuffer,
      ContentType: "image/webp",
    })
  );

  return thumbKey;
}

async function processTable(tableName: string, imageCol: string, thumbCol: string) {
  console.log(`\n── ${tableName} ──`);

  let query = supabase
    .from(tableName)
    .select("id, " + imageCol)
    .not(imageCol, "is", null)
    .is(thumbCol, null);

  if (limit > 0) query = query.limit(limit);
  const { data: rows, error } = await query;

  if (error) {
    console.error(`  ⛔ Error fetching ${tableName}: ${error.message}`);
    return;
  }

  if (!rows || rows.length === 0) {
    console.log(`  ✅ No rows need thumbnails`);
    return;
  }

  console.log(`  📋 ${rows.length} rows to process`);
  let success = 0;
  let failed = 0;

  for (const row of rows) {
    const imageUrl = row[imageCol] as string;
    if (!imageUrl) continue;

    // Resolve to R2 key (strip R2_URL prefix if present)
    const key = imageUrl.startsWith("http")
      ? imageUrl.replace(R2_URL + "/", "")
      : imageUrl.startsWith("/")
      ? imageUrl.substring(1)
      : imageUrl;

    try {
      const original = await downloadFromR2(key);
      const thumbBuffer = await sharp(original)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer();

      const thumbKey = await uploadThumb(key, thumbBuffer);

      // Update database
      await supabase
        .from(tableName)
        .update({ [thumbCol]: thumbKey })
        .eq("id", row.id);

      success++;
      process.stdout.write(`  ✅ ${success}/${rows.length}\r`);
    } catch (err: any) {
      failed++;
      console.error(`  ⛔ ${row.id}: ${err.message?.slice(0, 80)}`);
    }
  }

  console.log(`  Done: ${success} thumbnails generated, ${failed} failed`);
}

async function main() {
  console.log("🖼️  Ranna Thumbnail Backfill");
  console.log(`R2: ${R2_URL}`);
  console.log(`Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL}`);
  if (limit > 0) console.log(`Limit: ${limit} per table`);

  if (tableFilter === "all" || tableFilter === "tracks") {
    await processTable("tracks", "image_url", "thumbnail_url");
  }
  if (tableFilter === "all" || tableFilter === "artists") {
    await processTable("artists", "image_url", "thumbnail_url");
  }
  if (tableFilter === "all" || tableFilter === "authors") {
    await processTable("authors", "image_url", "thumbnail_url");
  }

  console.log("\n✅ Backfill complete!");
}

main().catch(console.error);
