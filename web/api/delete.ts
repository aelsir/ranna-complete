import type { VercelRequest, VercelResponse } from "@vercel/node";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// Same structures as upload.ts
interface StorageSlot {
  slot: number;
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
    throw new Error(`Storage slot ${slot} is not fully configured.`);
  }

  return { slot, endpoint, accessKey, secretKey, bucket, publicUrl };
}

function buildS3Client(slot: StorageSlot): S3Client {
  const regionMatch = slot.endpoint.match(/s3\.([a-z0-9-]+)\./);
  const region = regionMatch ? regionMatch[1] : "auto";

  return new S3Client({
    region,
    endpoint: slot.endpoint,
    credentials: {
      accessKeyId: slot.accessKey,
      secretAccessKey: slot.secretKey,
    },
    // Backblaze requires path-style
    forcePathStyle: true,
  });
}

function resolveSlotFromUrl(url: string): { slotConfig: StorageSlot; key: string } | null {
  // If we have an existing relative URL without domain, we'll assume it's the legacy Bucket (Slot 1) 
  // or it cannot be securely deleted by matching prefix. Safest is default to Slot 1 for relative.
  if (!url.startsWith("http")) {
      try {
          const legacySlot = getSlotConfig(1);
          return { slotConfig: legacySlot, key: url };
      } catch {
          return null;
      }
  }

  // Iterate over all 5 known possible slots to find a matching PUBLIC_URL prefix
  for (let s = 1; s <= 5; s++) {
    try {
      const config = getSlotConfig(s);
      if (url.startsWith(config.publicUrl)) {
        // e.g. "https://f003.backblaze.../my_bucket/audio/track.mp3" => "audio/track.mp3"
        // Also handling potential trailing slash on publicUrl
        const prefixWithSlash = config.publicUrl.endsWith('/') ? config.publicUrl : `${config.publicUrl}/`;
        let key = url.replace(prefixWithSlash, "");
        key = decodeURIComponent(key); // R2/S3 keys might be URL-encoded by the browser
        return { slotConfig: config, key };
      }
    } catch {
      // Slot not configured yet or empty, skip checking
    }
  }

  return null;
}


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify auth using service role for admin OR token for user
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
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "Missing required fields: urls array" });
    }

    const deletePromises = urls.map(async (url) => {
      const match = resolveSlotFromUrl(url);
      if (!match) {
        console.warn(`Could not resolve storage slot for URL: ${url}`);
        return { url, status: 'skipped', reason: 'No matching storage slot found' };
      }

      const { slotConfig, key } = match;
      const s3 = buildS3Client(slotConfig);

      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: slotConfig.bucket,
            Key: key,
          })
        );
        return { url, key, slot: slotConfig.slot, status: 'success' };
      } catch (err: any) {
        console.error(`Failed deleting ${key} from slot ${slotConfig.slot}:`, err.message);
        return { url, key, slot: slotConfig.slot, status: 'error', reason: err.message };
      }
    });

    const results = await Promise.all(deletePromises);
    
    return res.json({
      message: "Deletion sequence completed",
      results,
    });
  } catch (err: any) {
    console.error("Delete API error:", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
