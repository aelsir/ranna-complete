import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const SITE_URL = process.env.VITE_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://ranna.app";

interface OGMeta {
  title: string;
  description: string;
  ogType: string;
  canonicalPath: string;
}

async function getTrackMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("madha")
    .select("title, madih, madiheen:madih_id(name)")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!data) return null;
  const artistName = (data.madiheen as any)?.name || data.madih || "";
  return {
    title: data.title,
    description: artistName ? `المادح: ${artistName}` : "مدحة نبوية",
    ogType: "music.song",
    canonicalPath: `/track/${id}`,
  };
}

async function getArtistMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("madiheen")
    .select("name")
    .eq("id", id)
    .single();

  if (!data) return null;
  const { count } = await supabase
    .from("madha")
    .select("id", { count: "exact", head: true })
    .eq("madih_id", id)
    .eq("status", "approved");

  return {
    title: data.name,
    description: `${count || 0} مدحة على رنّة`,
    ogType: "profile",
    canonicalPath: `/profile/artist/${id}`,
  };
}

async function getNarratorMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("ruwat")
    .select("name")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    title: data.name,
    description: "راوي على رنّة",
    ogType: "profile",
    canonicalPath: `/profile/narrator/${id}`,
  };
}

async function getPlaylistMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("collections")
    .select("name, description")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    title: data.name,
    description: data.description || "قائمة تشغيل على رنّة",
    ogType: "music.playlist",
    canonicalPath: `/playlist/${id}`,
  };
}

function buildHTML(meta: OGMeta, ogImagePath: string): string {
  const fullUrl = `${SITE_URL}${meta.canonicalPath}`;
  const ogImageUrl = `${SITE_URL}/api/og-image${meta.canonicalPath}`;
  const fullTitle = `${meta.title} | رنّة`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fullTitle}</title>
  <meta name="description" content="${meta.description}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${meta.ogType}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${fullUrl}" />
  <meta property="og:site_name" content="رنّة" />
  <meta property="og:locale" content="ar_AR" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${meta.description}" />
  <meta name="twitter:image" content="${ogImageUrl}" />

  <!-- Redirect human visitors to the SPA -->
  <meta http-equiv="refresh" content="0;url=${meta.canonicalPath}" />
  <link rel="canonical" href="${fullUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${meta.canonicalPath}">${meta.title}</a>...</p>
  <script>window.location.replace("${meta.canonicalPath}");</script>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathSegments = (req.query.path as string[]) || [];
    const type = pathSegments[0];
    let meta: OGMeta | null = null;

    if (type === "track" && pathSegments[1]) {
      meta = await getTrackMeta(pathSegments[1]);
    } else if (type === "profile" && pathSegments[2]) {
      if (pathSegments[1] === "artist") {
        meta = await getArtistMeta(pathSegments[2]);
      } else if (pathSegments[1] === "narrator") {
        meta = await getNarratorMeta(pathSegments[2]);
      }
    } else if (type === "playlist" && pathSegments[1]) {
      meta = await getPlaylistMeta(pathSegments[1]);
    }

    // Fallback for unknown paths or deleted content
    if (!meta) {
      meta = {
        title: "رنّة",
        description: "منصة المدائح النبوية السودانية — استمع لأجمل المدائح النبوية",
        ogType: "website",
        canonicalPath: "/",
      };
    }

    const html = buildHTML(meta, meta.canonicalPath);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(html);
  } catch (err) {
    console.error("OG Shell error:", err);
    // Fallback — redirect to SPA
    return res.redirect(302, "/");
  }
}
