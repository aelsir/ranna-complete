import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

import { VitePWA } from "vite-plugin-pwa";

/**
 * Dev-only plugin: handles /api/upload so R2 uploads work with `vite dev`.
 * In production the same endpoint is served by a Vercel serverless function.
 */
function r2UploadDevPlugin(): Plugin {
  let env: Record<string, string>;
  return {
    name: "r2-upload-dev",
    configureServer(server) {
      // Load ALL env vars (empty prefix = no filtering) so R2_* vars are available
      env = loadEnv("development", process.cwd(), "");
      server.middlewares.use("/api/upload", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        // Read body
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = JSON.parse(Buffer.concat(chunks).toString());

        const { file, contentType, folder, filename } = body;
        if (!file || !contentType || !folder || !filename) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        try {
          const { S3Client, PutObjectCommand } = await import(
            "@aws-sdk/client-s3"
          );

          const activeSlot = parseInt(env.ACTIVE_STORAGE_SLOT || "1", 10);
          console.log(`[Upload API] Active storage slot detected: ${activeSlot}`);
          const prefix = `STORAGE_${activeSlot}`;
          console.log(`[Upload API] Loading config for prefix: ${prefix}`);
          
          const endpoint   = env[`${prefix}_ENDPOINT`];
          const accessKey  = env[`${prefix}_ACCESS_KEY`];
          const secretKey  = env[`${prefix}_SECRET_KEY`];
          const bucket     = env[`${prefix}_BUCKET`];
          const publicUrl  = env[`${prefix}_PUBLIC_URL`];

          console.log(`[Upload API] endpoint: ${endpoint}, bucket: ${bucket}`);

          if (!endpoint || !accessKey || !secretKey || !bucket || !publicUrl) {
            console.error(`[Upload API] Missing config for slot ${activeSlot}`);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: `Storage slot ${activeSlot} is not fully configured.` }));
            return;
          }

          const regionMatch = endpoint.match(/s3\.([a-z0-9-]+)\./);
          const region = regionMatch ? regionMatch[1] : "auto";

          const s3 = new S3Client({
            region,
            endpoint,
            credentials: {
              accessKeyId: accessKey,
              secretAccessKey: secretKey,
            },
            forcePathStyle: true,
          });

          const buffer = Buffer.from(file, "base64");
          const key = `${folder}/${filename}`;

          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: buffer,
              ContentType: contentType,
            })
          );

          // Generate thumbnail for images
          let thumbnailPath: string | undefined;
          let thumbnailUrl: string | undefined;
          if (contentType.startsWith("image/") && !contentType.includes("svg")) {
            try {
              const sharp = (await import("sharp")).default;
              const thumbBuffer = await sharp(buffer)
                .resize(150, 150, { fit: "cover" })
                .webp({ quality: 60 })
                .toBuffer();

              const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
              const thumbKey = `${folder}/${nameWithoutExt}-thumb.webp`;

              await s3.send(
                new PutObjectCommand({
                  Bucket: bucket,
                  Key: thumbKey,
                  Body: thumbBuffer,
                  ContentType: "image/webp",
                })
              );
              
              thumbnailPath = thumbKey;
              thumbnailUrl = `${publicUrl}/${thumbKey}`;
            } catch (thumbErr) {
              console.warn("Thumbnail generation failed:", thumbErr);
            }
          }

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              path: `${publicUrl}/${key}`,
              url: `${publicUrl}/${key}`,
              storageSlot: activeSlot,
              ...(thumbnailPath && {
                thumbnailPath: thumbnailUrl,
                thumbnailUrl,
              }),
            })
          );
        } catch (err: any) {
          console.error("Upload error:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message || "Upload failed" }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    fs: {
      allow: [".."],
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && r2UploadDevPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true, // Enable SW in development
      },
      manifest: false, // We already wrote manifest.webmanifest manually
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
}));
