// Supabase Edge Function: Weekly Friday Digest (single-file, batched)
//
// Single file by design — paste the whole thing into the Supabase Dashboard
// Edge Functions editor, OR deploy with `supabase functions deploy weekly_digest`.
//
// Round-trip budget regardless of user count:
//   • 1 SQL call to `get_weekly_digest_batch(since)` — every eligible
//     user's digest in one shot, joined with auth.users.email so we
//     don't need per-user `auth.admin.getUserById` calls.
//   • ceil(N / 100) calls to Resend's POST /emails/batch endpoint —
//     one HTTP per up-to-100 emails.
//
// So 100 users = 2 HTTP calls (1 DB + 1 Resend). 10,000 users = 101 calls.
//
// Required env vars (set in Project Settings → Edge Functions → Secrets):
//   • RESEND_API_KEY              — Resend API key
//   • RANNA_APP_URL               — base URL for "open in Ranna" CTAs
//   • RANNA_IMAGE_BASE_URL        — R2 bucket base for relative image_url
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected.)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RANNA_APP_URL = Deno.env.get("RANNA_APP_URL") ?? "https://ranna.aelsir.sd";
const RANNA_IMAGE_BASE_URL =
  Deno.env.get("RANNA_IMAGE_BASE_URL") ??
  "https://pub-5231206b23e34ae59ce4f085c70f77be.r2.dev";
const RANNA_FONT_BASE_URL =
  Deno.env.get("RANNA_FONT_BASE_URL") ?? "https://hoosh.aelsir.sd/fonts";

// Derive the sender domain from RANNA_APP_URL (handles missing protocol).
const RANNA_SENDER_DOMAIN = (() => {
  try {
    return new URL(RANNA_APP_URL).hostname;
  } catch {
    // If the env var has no protocol (e.g. "ranna.aelsir.sd"), use it as-is.
    return RANNA_APP_URL.replace(/\/+$/, "");
  }
})();

// Auth: The Supabase edge gateway validates the JWT in the Authorization
// header *before* this code runs. The cron job sends the project's
// service-role key as the Bearer token, so only authorised callers reach
// this point. No additional secret check is needed inside the function.

const RESEND_BATCH_SIZE = 100;
const LOOKBACK_DAYS = 7;

// =============================================================================
// Types
// =============================================================================

interface DigestTrack {
  id: string;
  title: string;
  created_at: string;
}

interface DigestGroup {
  type: "artist" | "author";
  id: string;
  name: string;
  image_url: string | null;
  tracks: DigestTrack[];
}

interface DigestRow {
  user_id: string;
  email: string;
  display_name: string | null;
  digest: DigestGroup[];
}

interface DigestRenderInput {
  displayName: string;
  appUrl: string;
  imageBaseUrl: string;
  fontBaseUrl: string;
  hijriDate: string;
  groups: DigestGroup[];
}

function formatHijriDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

interface RunReport {
  ok: boolean;
  window_since: string;
  recipients: number;
  sent: number;
  failed: number;
  duration_ms: number;
  errors?: { email?: string; reason: string }[];
}

// =============================================================================
// Template renderers (HTML, plain text, subject)
// =============================================================================

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!
  );

const resolveImage = (raw: string | null, baseUrl: string): string | null => {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${baseUrl.replace(/\/$/, "")}/${raw.replace(/^\//, "")}`;
};

const roleLabel = (type: "artist" | "author"): string =>
  type === "artist" ? "مادح" : "راوي";

const totalTracks = (groups: DigestGroup[]): number =>
  groups.reduce((acc, g) => acc + g.tracks.length, 0);

function renderTrackRow(track: DigestTrack, appUrl: string): string {
  const trackUrl = `${appUrl.replace(/\/$/, "")}/profile/track/${track.id}`;
  return `
    <tr>
      <td style="padding: 10px 0; border-top: 1px solid #eef3f3;">
        <a href="${escapeHtml(trackUrl)}" style="text-decoration:none; color:#0d2d2f; font-family:'IBM Plex Sans Arabic','Fustat',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; line-height:1.5;">
          ${escapeHtml(track.title)}
        </a>
      </td>
    </tr>`;
}

function renderGroup(
  group: DigestGroup,
  appUrl: string,
  imageBaseUrl: string,
): string {
  const profilePath = group.type === "artist" ? "artist" : "narrator";
  const profileUrl = `${appUrl.replace(/\/$/, "")}/profile/${profilePath}/${group.id}`;
  const img = resolveImage(group.image_url, imageBaseUrl);
  const avatar = img
    ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(group.name)}" width="48" height="48" style="display:block; width:48px; height:48px; border-radius:24px; object-fit:cover; border:0;" />`
    : `<div style="width:48px; height:48px; border-radius:24px; background-color:#1b4144; color:#ccff00; line-height:48px; text-align:center; font-family:'IBM Plex Sans Arabic','Fustat',sans-serif; font-weight:700; font-size:20px;">${escapeHtml(group.name.charAt(0))}</div>`;

  return `
    <tr>
      <td style="padding: 28px 0 0 0;" dir="rtl">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="60" valign="middle" style="padding-left:12px;">
              <a href="${escapeHtml(profileUrl)}" style="text-decoration:none;">${avatar}</a>
            </td>
            <td valign="middle">
              <a href="${escapeHtml(profileUrl)}" style="text-decoration:none; color:#0d2d2f; font-family:'IBM Plex Sans Arabic','Fustat',sans-serif; font-size:18px; font-weight:700; line-height:1.3;">
                ${escapeHtml(group.name)}
              </a>
              <div style="margin-top:2px; color:#6b7f80; font-family:'IBM Plex Sans Arabic','Noto Naskh Arabic',sans-serif; font-size:12px;">
                ${escapeHtml(roleLabel(group.type))} · ${group.tracks.length} ${group.tracks.length === 1 ? "مدحة جديدة" : "مدائح جديدة"}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 6px 0 0 60px;" dir="rtl">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          ${group.tracks.map((t) => renderTrackRow(t, appUrl)).join("")}
        </table>
      </td>
    </tr>`;
}

function renderDigestHtml(input: DigestRenderInput): string {
  const { displayName, appUrl, imageBaseUrl, fontBaseUrl, hijriDate, groups } = input;
  const namePart = displayName.trim() ? ` ${escapeHtml(displayName.trim())}` : "";
  const greeting = `جمعة مباركة${namePart}،`;
  const total = totalTracks(groups);
  const peopleCount = groups.length;
  const lead = `في يوم الجمعة، أكثروا من الصلاة على النبي ﷺ — وهذه ${total === 1 ? "مدحة جديدة" : `${total} مدحة جديدة`} من ${peopleCount === 1 ? (groups[0].type === "artist" ? "مادح" : "راوي") : `${peopleCount} ممن تتابعهم`} اخترناها لك من متابعاتك في رنّة.`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="rtl" lang="ar" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>جمعة مباركة من رنّة</title>
  <style>
    @font-face {
      font-family: 'IBM Plex Sans Arabic';
      src: url('${fontBaseUrl}/IBMPlexSansArabic-ExtraLight.woff2') format('woff2');
      font-weight: 200;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'IBM Plex Sans Arabic';
      src: url('${fontBaseUrl}/IBMPlexSansArabic-Regular.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'IBM Plex Sans Arabic';
      src: url('${fontBaseUrl}/IBMPlexSansArabic-Bold.woff2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    * { font-family: 'IBM Plex Sans Arabic', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f5fffe; }
    .cta-button {
      background-color: #ccff00;
      color: #0d2d2f !important;
      font-weight: 700;
      font-size: 16px;
      line-height: 1;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      display: inline-block;
      letter-spacing: 0.2px;
      font-family: 'IBM Plex Sans Arabic', 'Fustat', sans-serif;
    }
    @media screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px-mob { padding-left: 24px !important; padding-right: 24px !important; }
      .body-heading { font-size: 22px !important; }
      .body-text { font-size: 15px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5fffe;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f5fffe;">
    ${escapeHtml(`جمعة مباركة — ${total} ${total === 1 ? "مدحة جديدة" : "مدائح جديدة"} من متابعاتك في رنّة`)}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" dir="rtl" style="background-color:#f5fffe;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <table role="presentation" class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(13,45,47,0.06);">

          <!-- BANNER -->
          <tr>
            <td align="center" style="background-color:#1b4144; line-height: 0;">
              <img src="${escapeHtml(imageBaseUrl.replace(/\/$/, ""))}/images/ranna-brand/Ranna%20Email%20Bannar.jpg" alt="رنّة" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0;" />
            </td>
          </tr>
          <tr><td style="height:4px; background-color:#ccff00; line-height:4px; font-size:4px;">&nbsp;</td></tr>

          <!-- BODY -->
          <tr>
            <td class="px-mob" style="padding: 36px 48px 8px 48px;" dir="rtl">
              ${hijriDate ? `<div style="margin:0 0 8px 0; color:#6b7f80; font-size:12px; font-weight:400; line-height:1.4; text-align:right; letter-spacing:0.2px;">${escapeHtml(hijriDate)}</div>` : ""}
              <h1 class="body-heading" style="margin:0 0 12px 0; color:#0d2d2f; font-size:24px; font-weight:700; line-height:1.3; text-align:right;">
                ${greeting}
              </h1>
              <p class="body-text" style="margin:0 0 4px 0; color:#334649; font-size:16px; font-weight:400; line-height:1.85; text-align:right;">
                ${escapeHtml(lead)}
              </p>
            </td>
          </tr>

          <!-- SALAWAT CARD -->
          <tr>
            <td class="px-mob" style="padding: 20px 48px 4px 48px;" dir="rtl">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5fffe; border-right:3px solid #ccff00; border-radius:8px;">
                <tr>
                  <td style="padding:18px 20px;" dir="rtl">
                    <p style="margin:0; color:#0d2d2f; font-size:17px; font-weight:700; line-height:1.7; text-align:right;">
                      اللّهمَّ صلِّ وسلِّم وبارك على سيدنا محمد وعلى آله وصحبه أجمعين
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GROUPS -->
          <tr>
            <td class="px-mob" style="padding: 0 48px 12px 48px;" dir="rtl">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                ${groups.map((g) => renderGroup(g, appUrl, imageBaseUrl)).join("")}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" class="px-mob" style="padding: 28px 48px 36px 48px;">
              <a href="${escapeHtml(appUrl)}" class="cta-button" target="_blank" rel="noopener">
                افتح رنّة
              </a>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td class="px-mob" style="padding: 0 48px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="border-top:1px solid #e6eff0; height:1px; line-height:1px; font-size:1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- UNSUBSCRIBE NOTE -->
          <tr>
            <td class="px-mob" style="padding: 24px 48px 40px 48px;" dir="rtl">
              <p style="font-family:'IBM Plex Sans Arabic','Noto Naskh Arabic',sans-serif; margin:0; color:#6b7f80; font-size:13px; line-height:1.75; text-align:right;">
                تتلقّى هذا البريد لأنك مفعّل إشعارات رنّة. يمكنك إيقافها من <a href="${escapeHtml(appUrl)}/account" style="color:#1b4144; text-decoration:underline;">صفحة زاويتي</a>.
              </p>
            </td>
          </tr>

        </table>

        <!-- FOOTER -->
        <table role="presentation" class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; margin-top:24px;">
          <tr>
            <td align="center" class="px-mob" style="padding: 0 48px;" dir="rtl">
              <p style="font-family:'IBM Plex Sans Arabic','Noto Naskh Arabic',sans-serif; margin:0 0 6px 0; color:#8a9c9e; font-size:13px; line-height:1.6; text-align:center;">
                رنّة | للمدائح النبوية
              </p>
              <p style="font-family:'IBM Plex Sans Arabic','Fustat',sans-serif; margin:0; color:#b2c0c2; font-size:11px; line-height:1.6; text-align:center; letter-spacing:0.3px;">
                &copy; 2026 Ranna · <a href="https://ranna.aelsir.sd" style="color:#8a9c9e; text-decoration:none;">ranna.aelsir.sd</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderDigestText(input: DigestRenderInput): string {
  const { displayName, appUrl, hijriDate, groups } = input;
  const namePart = displayName.trim() ? ` ${displayName.trim()}` : "";
  const greeting = `جمعة مباركة${namePart}،`;
  const total = totalTracks(groups);
  const lines: string[] = [
    greeting,
    ...(hijriDate ? [hijriDate] : []),
    "",
    "اللّهمَّ صلِّ وسلِّم وبارك على سيدنا محمد وعلى آله وصحبه أجمعين.",
    "",
    `${total === 1 ? "مدحة جديدة" : `${total} مدائح جديدة`} من متابعاتك في رنّة هذا الأسبوع:`,
    "",
  ];
  for (const g of groups) {
    lines.push(`— ${g.name} (${roleLabel(g.type)})`);
    for (const t of g.tracks) {
      lines.push(`   • ${t.title}`);
    }
    lines.push("");
  }
  lines.push(`افتح رنّة: ${appUrl}`);
  lines.push("");
  lines.push("لإيقاف هذا البريد، أوقف الإشعارات من صفحة زاويتي في التطبيق.");
  return lines.join("\n");
}

function renderDigestSubject(groups: DigestGroup[]): string {
  if (groups.length === 1) {
    const g = groups[0];
    const count = g.tracks.length;
    return `جمعة مباركة — جديد ${g.name}: ${count === 1 ? "مدحة" : `${count} مدائح`}`;
  }
  const total = totalTracks(groups);
  return `جمعة مباركة — ${total === 1 ? "مدحة جديدة" : `${total} مدائح جديدة`} من متابعاتك`;
}

// =============================================================================
// HTTP entry point
// =============================================================================

serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();

  // ─── Auth gate ───────────────────────────────────────────────────────
  // The Supabase gateway already verified the JWT. We just do a quick
  // sanity check that an Authorization header was actually present.
  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { ok: false, error: "Server is missing required env vars" },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return jsonResponse(
      { ok: false, error: "Missing Authorization header" },
      401,
    );
  }

  const supabase: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  );

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400 * 1000)
    .toISOString();

  // ─── ONE database round-trip: every eligible user's digest ───────────
  const { data: rowsRaw, error: rpcErr } = await supabase.rpc(
    "get_weekly_digest_batch",
    { p_since: since },
  );

  if (rpcErr) {
    return jsonResponse(
      { ok: false, error: `Batch RPC failed: ${rpcErr.message}` },
      500,
    );
  }

  const rows = (rowsRaw ?? []) as DigestRow[];

  const report: RunReport = {
    ok: true,
    window_since: since,
    recipients: rows.length,
    sent: 0,
    failed: 0,
    duration_ms: 0,
    errors: [],
  };

  if (rows.length === 0) {
    report.duration_ms = Date.now() - startedAt;
    delete report.errors;
    return jsonResponse(report, 200);
  }

  // ─── Render every email in memory ────────────────────────────────────
  type ResendEmail = {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    headers: Record<string, string>;
  };
  const hijriDate = formatHijriDate(new Date());
  const unsubscribeUrl = `${RANNA_APP_URL.replace(/\/$/, "")}/account`;
  const emails: ResendEmail[] = rows.map((r): ResendEmail | null => {
    const groups = Array.isArray(r.digest) ? r.digest : [];
    if (groups.length === 0) return null;
    const ctx = {
      displayName: r.display_name ?? "",
      appUrl: RANNA_APP_URL,
      imageBaseUrl: RANNA_IMAGE_BASE_URL,
      fontBaseUrl: RANNA_FONT_BASE_URL,
      hijriDate,
      groups,
    };
    return {
      from: `Ranna رنّة <noreply@${RANNA_SENDER_DOMAIN}>`,
      to: [r.email],
      subject: renderDigestSubject(groups),
      html: renderDigestHtml(ctx),
      text: renderDigestText(ctx),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:unsubscribe@${RANNA_SENDER_DOMAIN}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  }).filter((e): e is ResendEmail => e !== null);

  // Idempotency key per cron firing (UTC week-start), so accidental
  // double-invocations within the same Friday window don't double-send.
  const weekStartKey = (() => {
    const d = new Date();
    const day = d.getUTCDay(); // 0=Sun..6=Sat; Friday=5
    const daysSinceFri = (day - 5 + 7) % 7;
    const fri = new Date(Date.UTC(
      d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceFri,
    ));
    return fri.toISOString().slice(0, 10);
  })();

  // ─── Send to Resend in chunks of RESEND_BATCH_SIZE ───────────────────
  for (let i = 0; i < emails.length; i += RESEND_BATCH_SIZE) {
    const chunk = emails.slice(i, i + RESEND_BATCH_SIZE);
    try {
      const chunkIndex = Math.floor(i / RESEND_BATCH_SIZE);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Idempotency-Key": `weekly-digest-${weekStartKey}-chunk-${chunkIndex}`,
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        const body = await res.text();
        report.failed += chunk.length;
        report.errors!.push({
          reason: `resend batch ${res.status}: ${body.slice(0, 300)}`,
        });
        continue;
      }
      report.sent += chunk.length;
    } catch (e) {
      report.failed += chunk.length;
      report.errors!.push({
        reason: `exception: ${(e as Error).message ?? String(e)}`,
      });
    }
  }

  report.duration_ms = Date.now() - startedAt;
  if (report.errors && report.errors.length === 0) delete report.errors;

  return jsonResponse(report, 200);
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
