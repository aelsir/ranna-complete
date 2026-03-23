import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { join } from "path";

// Fonts (loaded once, cached in serverless warm starts)
const notoNaskhBold = readFileSync(join(process.cwd(), "api/fonts/NotoNaskhArabic-Bold.ttf"));
const fustatBold = readFileSync(join(process.cwd(), "api/fonts/Fustat-Bold.ttf"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const R2_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${R2_URL}/${url}`;
}

interface OGData {
  title: string;
  subtitle: string;
  label: string;
  imageUrl: string;
  isCircle?: boolean;
}

async function getTrackData(id: string): Promise<OGData | null> {
  const { data } = await supabase
    .from("madha")
    .select("title, madih, image_url, madih_id, madiheen:madih_id(name, image_url)")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!data) return null;
  const artistName = (data.madiheen as any)?.name || data.madih || "";
  const imageUrl = data.image_url || (data.madiheen as any)?.image_url || "";
  return {
    title: data.title,
    subtitle: artistName,
    label: "مدحة",
    imageUrl: resolveImageUrl(imageUrl),
  };
}

async function getArtistData(id: string): Promise<OGData | null> {
  const { data } = await supabase
    .from("madiheen")
    .select("name, image_url")
    .eq("id", id)
    .single();

  if (!data) return null;
  // Get track count
  const { count } = await supabase
    .from("madha")
    .select("id", { count: "exact", head: true })
    .eq("madih_id", id)
    .eq("status", "approved");

  return {
    title: data.name,
    subtitle: `${count || 0} مدحة`,
    label: "مادح",
    imageUrl: resolveImageUrl(data.image_url),
    isCircle: true,
  };
}

async function getNarratorData(id: string): Promise<OGData | null> {
  const { data } = await supabase
    .from("ruwat")
    .select("name, image_url")
    .eq("id", id)
    .single();

  if (!data) return null;
  const { count } = await supabase
    .from("madha")
    .select("id", { count: "exact", head: true })
    .eq("rawi_id", id)
    .eq("status", "approved");

  return {
    title: data.name,
    subtitle: `${count || 0} مدحة`,
    label: "راوي",
    imageUrl: resolveImageUrl(data.image_url),
    isCircle: true,
  };
}

async function getPlaylistData(id: string): Promise<OGData | null> {
  const { data } = await supabase
    .from("collections")
    .select("name, description, image_url")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    title: data.name,
    subtitle: data.description || "قائمة تشغيل",
    label: "قائمة",
    imageUrl: resolveImageUrl(data.image_url),
  };
}

function buildOGImage(data: OGData) {
  // Using React-like JSX syntax for Satori
  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "center",
        background: "linear-gradient(135deg, #1b4144 0%, #0f2a2c 100%)",
        padding: "60px",
        fontFamily: '"Noto Naskh Arabic"',
        direction: "rtl",
      },
      children: [
        // Image
        data.imageUrl
          ? {
              type: "div",
              props: {
                style: {
                  width: 280,
                  height: 280,
                  borderRadius: data.isCircle ? 140 : 24,
                  overflow: "hidden",
                  flexShrink: 0,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                  display: "flex",
                },
                children: {
                  type: "img",
                  props: {
                    src: data.imageUrl,
                    width: 280,
                    height: 280,
                    style: { objectFit: "cover", width: "100%", height: "100%" },
                  },
                },
              },
            }
          : {
              type: "div",
              props: {
                style: {
                  width: 280,
                  height: 280,
                  borderRadius: data.isCircle ? 140 : 24,
                  background: "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 80,
                  color: "rgba(255,255,255,0.3)",
                },
                children: "♪",
              },
            },
        // Text content
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              marginRight: 48,
              flex: 1,
              color: "white",
            },
            children: [
              // Label
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 20,
                    color: "#b4ff00",
                    fontFamily: '"Fustat"',
                    marginBottom: 12,
                  },
                  children: data.label,
                },
              },
              // Title
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 48,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxHeight: "130px",
                  },
                  children: data.title,
                },
              },
              // Subtitle
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 26,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: '"Fustat"',
                    marginTop: 16,
                  },
                  children: data.subtitle,
                },
              },
            ],
          },
        },
        // Logo watermark
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 40,
              left: 60,
              display: "flex",
              alignItems: "center",
              gap: 10,
            },
            children: {
              type: "span",
              props: {
                style: {
                  fontSize: 28,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: '"Fustat"',
                },
                children: "رنّة",
              },
            },
          },
        },
      ],
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathSegments = (req.query.path as string[]) || [];
    // Expected: /api/og-image/track/:id or /api/og-image/profile/artist/:id etc.
    const type = pathSegments[0];
    let ogData: OGData | null = null;

    if (type === "track" && pathSegments[1]) {
      ogData = await getTrackData(pathSegments[1]);
    } else if (type === "profile" && pathSegments[2]) {
      const profileType = pathSegments[1]; // "artist" or "narrator"
      if (profileType === "artist") {
        ogData = await getArtistData(pathSegments[2]);
      } else if (profileType === "narrator") {
        ogData = await getNarratorData(pathSegments[2]);
      }
    } else if (type === "playlist" && pathSegments[1]) {
      ogData = await getPlaylistData(pathSegments[1]);
    }

    // Fallback
    if (!ogData) {
      ogData = {
        title: "رنّة",
        subtitle: "منصة المدائح النبوية السودانية",
        label: "",
        imageUrl: "",
      };
    }

    const svg = await satori(buildOGImage(ogData) as any, {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Noto Naskh Arabic",
          data: notoNaskhBold,
          weight: 700,
          style: "normal",
        },
        {
          name: "Fustat",
          data: fustatBold,
          weight: 700,
          style: "normal",
        },
      ],
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
    });
    const png = resvg.render().asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(png);
  } catch (err) {
    console.error("OG Image error:", err);
    return res.status(500).json({ error: "Failed to generate image" });
  }
}
