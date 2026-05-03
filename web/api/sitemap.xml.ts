import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const SITE_URL = "https://ranna.aelsir.sd";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Fetch all approved tracks
    const { data: tracks } = await supabase
      .from("madha")
      .select("id, updated_at")
      .eq("status", "approved")
      .order("updated_at", { ascending: false });

    // Fetch all artists
    const { data: artists } = await supabase
      .from("artists")
      .select("id, updated_at")
      .order("updated_at", { ascending: false });

    // Fetch all narrators
    const { data: narrators } = await supabase
      .from("authors")
      .select("id, updated_at")
      .order("updated_at", { ascending: false });

    // Fetch all active collections/playlists
    const { data: playlists } = await supabase
      .from("collections")
      .select("id, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    const now = new Date().toISOString();

    let urls = "";

    // Homepage — highest priority
    urls += `
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Static browse pages
    for (const page of ["/artists", "/narrators", "/playlists", "/tariqas", "/funoon", "/search"]) {
      urls += `
  <url>
    <loc>${SITE_URL}${page}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Track pages — these are the SEO goldmine (lyrics + titles)
    for (const t of tracks || []) {
      urls += `
  <url>
    <loc>${SITE_URL}/track/${t.id}</loc>
    <lastmod>${t.updated_at || now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;
    }

    // Artist profiles
    for (const a of artists || []) {
      urls += `
  <url>
    <loc>${SITE_URL}/profile/artist/${a.id}</loc>
    <lastmod>${a.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Narrator profiles
    for (const n of narrators || []) {
      urls += `
  <url>
    <loc>${SITE_URL}/profile/narrator/${n.id}</loc>
    <lastmod>${n.updated_at || now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // Playlists
    for (const p of playlists || []) {
      urls += `
  <url>
    <loc>${SITE_URL}/playlist/${p.id}</loc>
    <lastmod>${p.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("Sitemap error:", err);
    return res.status(500).send("Error generating sitemap");
  }
}
