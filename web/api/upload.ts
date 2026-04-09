import type { VercelRequest, VercelResponse } from "@vercel/node";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// ─────────────────────────────────────────────────────────────
// Multi-slot storage configuration
//
// Each slot is configured via numbered env vars:
//   STORAGE_N_ENDPOINT   — full S3-compatible endpoint URL
//   STORAGE_N_ACCESS_KEY — access key ID
//   STORAGE_N_SECRET_KEY — secret access key
//   STORAGE_N_BUCKET     — bucket name
//   STORAGE_N_PUBLIC_URL — public base URL for reading files
//
// Switch active bucket by changing: ACTIVE_STORAGE_SLOT=N
//
// Slot examples:
//   Cloudflare R2  → endpoint: https://<accountId>.r2.cloudflarestorage.com
//   Backblaze B2   → endpoint: https://s3.<region>.backblazeb2.com
//   IDrive E2      → endpoint: https://s3.eu-central-2.idrivee2.com
// ─────────────────────────────────────────────────────────────

interface StorageSlot {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
}

function getSlotConfig(slot: number): StorageSlot {
  const prefix = `STORAGE_${slot}`;
  const endpoint   = process.env[`${prefix}_ENDPOINT`];
  const accessKey  = process.env[`${prefix}_ACCESS_KEY`];
  const secretKey  = process.env[`${prefix}_SECRET_KEY`];
  const bucket     = process.env[`${prefix}_BUCKET`];
  const publicUrl  = process.env[`${prefix}_PUBLIC_URL`];

  if (!endpoint || !accessKey || !secretKey || !bucket || !publicUrl) {
    throw new Error(
      `Storage slot ${slot} is not fully configured. ` +
      `Make sure all STORAGE_${slot}_* env vars are set.`
    );
  }

  return { endpoint, accessKey, secretKey, bucket, publicUrl };
}

function buildS3Client(slot: StorageSlot): S3Client {
  // Auto-detect region from endpoint if possible (required for Backblaze and IDrive)
  // Example: https://s3.eu-central-003.backblazeb2.com -> eu-central-003
  const regionMatch = slot.endpoint.match(/s3\.([a-z0-9-]+)\./);
  const region = regionMatch ? regionMatch[1] : "auto";

  return new S3Client({
    region,
    endpoint: slot.endpoint,
    credentials: {
      accessKeyId: slot.accessKey,
      secretAccessKey: slot.secretKey,
    },
    // Backblaze B2 requires path-style (not virtual-hosted)
    forcePathStyle: true,
  });
}

// ─────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const THUMB_SIZE = 150;
const THUMB_QUALITY = 60;

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/") && !contentType.includes("svg");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { file, contentType, folder, filename } = req.body;
    if (!file || !contentType || !folder || !filename) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Resolve active storage slot
    const activeSlot = parseInt(process.env.ACTIVE_STORAGE_SLOT || "1", 10);
    const slotConfig = getSlotConfig(activeSlot);
    const s3 = buildS3Client(slotConfig);

    const buffer = Buffer.from(file, "base64");
    const key = `${folder}/${filename}`;

    // Upload original file
    await s3.send(
      new PutObjectCommand({
        Bucket: slotConfig.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Generate and upload thumbnail for images
    let thumbnailPath: string | undefined;
    let thumbnailUrl: string | undefined;

    if (isImage(contentType)) {
      try {
        const thumbBuffer = await sharp(buffer)
          .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
          .webp({ quality: THUMB_QUALITY })
          .toBuffer();

        const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
        const thumbKey = `${folder}/${nameWithoutExt}-thumb.webp`;

        await s3.send(
          new PutObjectCommand({
            Bucket: slotConfig.bucket,
            Key: thumbKey,
            Body: thumbBuffer,
            ContentType: "image/webp",
          })
        );

        thumbnailPath = thumbKey;
        thumbnailUrl = `${slotConfig.publicUrl}/${thumbKey}`;
      } catch (thumbErr) {
        // Thumbnail generation is best-effort — don't fail the upload
        console.warn("Thumbnail generation failed:", thumbErr);
      }
    }

    return res.json({
      path: `${slotConfig.publicUrl}/${key}`,   // full absolute URL
      url:  `${slotConfig.publicUrl}/${key}`,
      storageSlot: activeSlot,
      ...(thumbnailPath && {
        thumbnailPath: thumbnailUrl,
        thumbnailUrl,
      }),
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    const message = err?.message || "Unknown error";
    const code = err?.$metadata?.httpStatusCode || err?.Code || "";
    const detail = code ? `${message} (${code})` : message;
    return res.status(500).json({ error: detail });
  }
}
