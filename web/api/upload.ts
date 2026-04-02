import type { VercelRequest, VercelResponse } from "@vercel/node";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const THUMB_SIZE = 150;
const THUMB_QUALITY = 60;

/** Check if this content type is an image we can thumbnail */
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

    const buffer = Buffer.from(file, "base64");
    const key = `${folder}/${filename}`;

    // Upload original
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Generate and upload thumbnail for images
    let thumbnailPath: string | undefined;
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
            Bucket: process.env.R2_BUCKET_NAME,
            Key: thumbKey,
            Body: thumbBuffer,
            ContentType: "image/webp",
          })
        );

        thumbnailPath = thumbKey;
      } catch (thumbErr) {
        // Thumbnail generation is best-effort — don't fail the upload
        console.warn("Thumbnail generation failed:", thumbErr);
      }
    }

    return res.json({
      path: key,
      url: `${process.env.R2_PUBLIC_URL}/${key}`,
      ...(thumbnailPath && {
        thumbnailPath,
        thumbnailUrl: `${process.env.R2_PUBLIC_URL}/${thumbnailPath}`,
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
