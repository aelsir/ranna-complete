import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const SITE_URL = process.env.VITE_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://ranna.aelsir.sd";

// ── Data types ──

interface TrackData {
  id: string;
  title: string;
  madih: string | null;
  lyrics: string | null;
  writer: string | null;
  recording_place: string | null;
  duration_seconds: number | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string | null;
  madiheen: { name: string; image_url: string | null } | null;
  ruwat: { name: string } | null;
  turuq: { name: string } | null;
  funun: { name: string } | null;
}

interface OGMeta {
  title: string;
  description: string;
  ogType: string;
  canonicalPath: string;
  jsonLd?: object;
  bodyHtml?: string;
}

// ── Helpers ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `PT${h}H${m}M${s}S`
    : `PT${m}M${s}S`;
}

function formatDurationHuman(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Track page — the SEO goldmine ──

async function getTrackMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("v_tracks")
    .select("id, title, madih, lyrics, writer, recording_place, duration_seconds, image_url, audio_url, created_at, madiheen:madih_id(name, image_url), ruwat:rawi_id(name), turuq:tariqa_id(name), funun:fan_id(name)")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!data) return null;

  const track = data as unknown as TrackData;
  const artistName = track.madiheen?.name || track.madih || "";
  const narratorName = track.ruwat?.name || track.writer || "";
  const tariqaName = track.turuq?.name || "";
  const fanName = track.funun?.name || "";
  const imageUrl = track.image_url || track.madiheen?.image_url || "";
  const lyricsSnippet = track.lyrics
    ? track.lyrics.substring(0, 200).replace(/\n/g, " ") + "..."
    : "";

  // Build rich description
  const descParts = [`المادح: ${artistName}`];
  if (narratorName) descParts.push(`الراوي: ${narratorName}`);
  if (tariqaName) descParts.push(`الطريقة: ${tariqaName}`);
  if (lyricsSnippet) descParts.push(lyricsSnippet);
  const description = descParts.join(" | ");

  // JSON-LD structured data — MusicRecording schema
  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": track.title,
    "url": `${SITE_URL}/track/${id}`,
    "inLanguage": "ar",
    ...(track.duration_seconds && { "duration": formatDuration(track.duration_seconds) }),
    ...(imageUrl && { "image": imageUrl }),
    ...(track.audio_url && {
      "audio": {
        "@type": "AudioObject",
        "contentUrl": track.audio_url,
        "encodingFormat": "audio/mpeg",
      },
    }),
    ...(artistName && {
      "byArtist": {
        "@type": "MusicGroup",
        "name": artistName,
      },
    }),
    ...(track.recording_place && {
      "recordedAt": {
        "@type": "Place",
        "name": track.recording_place,
      },
    }),
    ...(track.created_at && { "datePublished": track.created_at.split("T")[0] }),
    "isAccessibleForFree": true,
  };

  // If lyrics exist, add them as a CreativeWork
  if (track.lyrics) {
    jsonLd["recordingOf"] = {
      "@type": "MusicComposition",
      "name": track.title,
      "lyrics": {
        "@type": "CreativeWork",
        "text": track.lyrics,
        ...(narratorName && { "author": { "@type": "Person", "name": narratorName } }),
      },
      "inLanguage": "ar",
    };
  }

  // Build semantic HTML body with full lyrics for crawlers
  let bodyHtml = `
    <article itemscope itemtype="https://schema.org/MusicRecording">
      <header>
        <h1 itemprop="name">${escapeHtml(track.title)}</h1>
        <p>المادح: <strong itemprop="byArtist">${escapeHtml(artistName)}</strong></p>
        ${narratorName ? `<p>الراوي: <strong>${escapeHtml(narratorName)}</strong></p>` : ""}
        ${tariqaName ? `<p>الطريقة: <span>${escapeHtml(tariqaName)}</span></p>` : ""}
        ${fanName ? `<p>الفن: <span>${escapeHtml(fanName)}</span></p>` : ""}
        ${track.duration_seconds ? `<p>المدة: <time itemprop="duration" datetime="${formatDuration(track.duration_seconds)}">${formatDurationHuman(track.duration_seconds)}</time></p>` : ""}
        ${track.recording_place ? `<p>مكان التسجيل: <span>${escapeHtml(track.recording_place)}</span></p>` : ""}
      </header>`;

  if (track.lyrics) {
    bodyHtml += `
      <section>
        <h2>كلمات المدحة</h2>
        <div itemprop="lyrics" itemscope itemtype="https://schema.org/CreativeWork">
          <p itemprop="text" style="white-space:pre-line">${escapeHtml(track.lyrics)}</p>
        </div>
      </section>`;
  }

  bodyHtml += `
    </article>`;

  return {
    title: track.title,
    description,
    ogType: "music.song",
    canonicalPath: `/track/${id}`,
    jsonLd,
    bodyHtml,
  };
}

// ── Artist page ──

async function getArtistMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("madiheen")
    .select("name, image_url, bio")
    .eq("id", id)
    .single();

  if (!data) return null;

  // Get track count and track list
  const { data: tracks, count } = await supabase
    .from("madha")
    .select("id, title", { count: "exact" })
    .eq("madih_id", id)
    .eq("status", "approved")
    .order("play_count", { ascending: false })
    .limit(50);

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "name": data.name,
    "url": `${SITE_URL}/profile/artist/${id}`,
    ...(data.image_url && { "image": data.image_url }),
    ...(data.bio && { "description": data.bio }),
    "genre": "المدائح النبوية السودانية",
  };

  // Semantic body with track listing
  let bodyHtml = `
    <article itemscope itemtype="https://schema.org/MusicGroup">
      <h1 itemprop="name">${escapeHtml(data.name)}</h1>
      <p>${count || 0} مدحة على رنّة — منصة المدائح النبوية السودانية</p>
      ${data.bio ? `<p itemprop="description">${escapeHtml(data.bio)}</p>` : ""}`;

  if (tracks && tracks.length > 0) {
    bodyHtml += `
      <section>
        <h2>مدائح ${escapeHtml(data.name)}</h2>
        <ul>
          ${tracks.map((t) => `<li><a href="/track/${t.id}">${escapeHtml(t.title)}</a></li>`).join("\n          ")}
        </ul>
      </section>`;
  }

  bodyHtml += `
    </article>`;

  return {
    title: data.name,
    description: `${count || 0} مدحة للمادح ${data.name} على رنّة — منصة المدائح النبوية السودانية`,
    ogType: "profile",
    canonicalPath: `/profile/artist/${id}`,
    jsonLd,
    bodyHtml,
  };
}

// ── Narrator page ──

async function getNarratorMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("ruwat")
    .select("name")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    title: data.name,
    description: `الراوي ${data.name} على رنّة — منصة المدائح النبوية السودانية`,
    ogType: "profile",
    canonicalPath: `/profile/narrator/${id}`,
    bodyHtml: `<article><h1>${escapeHtml(data.name)}</h1><p>راوي على رنّة — منصة المدائح النبوية السودانية</p></article>`,
  };
}

// ── Playlist page ──

async function getPlaylistMeta(id: string): Promise<OGMeta | null> {
  const { data } = await supabase
    .from("collections")
    .select("name, description")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    title: data.name,
    description: data.description || `قائمة تشغيل على رنّة — منصة المدائح النبوية السودانية`,
    ogType: "music.playlist",
    canonicalPath: `/playlist/${id}`,
    bodyHtml: `<article><h1>${escapeHtml(data.name)}</h1>${data.description ? `<p>${escapeHtml(data.description)}</p>` : ""}</article>`,
  };
}

// ── Homepage meta ──

function getHomepageMeta(): OGMeta {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "رنّة",
    "alternateName": "Ranna",
    "url": SITE_URL,
    "description": "أكبر منصة للمدائح النبوية السودانية — استمع لأجمل المدائح النبوية وابحث في الكلمات والأذكار",
    "inLanguage": "ar",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return {
    title: "رنّة — أكبر منصة للمدائح النبوية السودانية",
    description: "استمع لأجمل المدائح النبوية السودانية وابحث في كلمات المدائح. أكبر مكتبة صوتية للمدائح النبوية السودانية على الإنترنت.",
    ogType: "website",
    canonicalPath: "/",
    jsonLd,
    bodyHtml: `
      <article>
        <h1>رنّة — أكبر منصة للمدائح النبوية السودانية</h1>
        <p>استمع لأجمل المدائح النبوية السودانية وابحث في كلمات المدائح والأذكار. أكبر مكتبة صوتية للمدائح النبوية السودانية على الإنترنت.</p>
        <h2>تصفح المدائح النبوية</h2>
        <ul>
          <li><a href="/artists">جميع المدّاحين</a></li>
          <li><a href="/narrators">جميع الرواة</a></li>
          <li><a href="/playlists">قوائم التشغيل</a></li>
          <li><a href="/tariqas">الطرق الصوفية</a></li>
          <li><a href="/funoon">الفنون</a></li>
          <li><a href="/search">البحث في المدائح والكلمات</a></li>
        </ul>
      </article>`,
  };
}

// ── HTML builder with rich SEO markup ──

function buildHTML(meta: OGMeta): string {
  const fullUrl = `${SITE_URL}${meta.canonicalPath}`;
  const ogImageUrl = `${SITE_URL}/api/og-image${meta.canonicalPath}`;
  const fullTitle = meta.canonicalPath === "/"
    ? meta.title
    : `${meta.title} | رنّة`;

  const jsonLdScript = meta.jsonLd
    ? `\n  <script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  <link rel="canonical" href="${fullUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${meta.ogType}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${fullUrl}" />
  <meta property="og:site_name" content="رنّة" />
  <meta property="og:locale" content="ar_AR" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  ${jsonLdScript}

  <!-- Redirect human visitors to the SPA -->
  <meta http-equiv="refresh" content="0;url=${meta.canonicalPath}" />
</head>
<body>
  ${meta.bodyHtml || `<p>Redirecting to <a href="${meta.canonicalPath}">${escapeHtml(meta.title)}</a>...</p>`}
  <footer>
    <p>رنّة — أكبر منصة للمدائح النبوية السودانية</p>
    <nav>
      <a href="/">الرئيسية</a> |
      <a href="/artists">المدّاحين</a> |
      <a href="/search">البحث</a>
    </nav>
  </footer>
  <script>window.location.replace("${meta.canonicalPath}");</script>
</body>
</html>`;
}

// ── Handler ──

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathSegments = (req.query.path as string[]) || [];
    const type = pathSegments[0];
    let meta: OGMeta | null = null;

    if (!type || type === "") {
      meta = getHomepageMeta();
    } else if (type === "track" && pathSegments[1]) {
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
        description: "أكبر منصة للمدائح النبوية السودانية — استمع لأجمل المدائح النبوية وابحث في الكلمات",
        ogType: "website",
        canonicalPath: "/",
      };
    }

    const html = buildHTML(meta);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(html);
  } catch (err) {
    console.error("OG Shell error:", err);
    // Fallback — redirect to SPA
    return res.redirect(302, "/");
  }
}
