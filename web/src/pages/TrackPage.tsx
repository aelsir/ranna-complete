import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Clock, Loader2, Smartphone, WifiOff, ChevronDown, ChevronUp } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMadha, useMadhaatByMadih } from "@/lib/api/hooks";
import { getImageUrl, formatDuration } from "@/lib/format";
import { usePlayer } from "@/context/PlayerContext";
import { ShareButton } from "@/components/ShareButton";
import { getTrackShareUrl } from "@/lib/share";
import TrackRow from "@/components/TrackRow";

// ── App Store URLs from env ──
const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || "";
const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || "";



// ── App Download Banner Component ──
// ── Inline SVG icons for App Store and Play Store ──
const AppleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 384 512" className={className} fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-27.1-46.9-42.3-83.7-45.6-35.5-3.2-74.2 20.9-88.5 20.9-15.1 0-49.3-19.7-74.5-19.7C59.6 140.5 0 181.3 0 270.3c0 26.2 4.8 53.3 14.4 81.2 12.8 37.1 59 128.1 107.2 126.5 25.3-.6 43.3-18.1 74.5-18.1 30.1 0 46.9 18.1 74.5 18.1 48.6-.7 90.4-82.5 102.6-119.7-65.2-30.7-61.5-90-61.5-90.6zm-56.6-164.2c27.3-32.4 24.8-62.1 24-72.5-24 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
);

const PlayStoreIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} fill="currentColor">
    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
  </svg>
);

function AppDownloadBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("ranna_app_banner_dismissed") === "true") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("ranna_app_banner_dismissed", "true");
  };

  if (dismissed) return null;

  const hasIos = !!APP_STORE_URL;
  const hasAndroid = !!PLAY_STORE_URL;
  // Hide completely if neither URL is configured
  if (!hasIos && !hasAndroid) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
      className="mx-5 mb-4"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-bl from-primary/[0.06] via-card to-accent/[0.04]">
        {/* Decorative glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-4 flex items-start gap-3.5">
          {/* App icon */}
          <div className="flex-shrink-0 h-14 w-14 rounded-[14px] bg-white shadow-md flex items-center justify-center p-1.5 border border-border/50">
            <img src="/pwa-192x192.png" alt="رنّة" className="w-full h-full object-contain rounded-lg" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-fustat text-sm font-bold text-foreground leading-tight">
              استمع في تطبيق رنّة
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              تجربة أفضل • تحميل مدائح بدون نت • إشعارات بالجديد
            </p>

            {/* Store buttons — both always visible */}
            <div className="flex items-center gap-2 mt-3">
              {hasIos && (
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-foreground text-background text-[11px] font-fustat font-bold hover:opacity-90 transition-opacity"
                >
                  <AppleIcon className="h-4 w-4" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] font-normal opacity-70">حمّل من</span>
                    <span>App Store</span>
                  </div>
                </a>
              )}
              {hasAndroid && (
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-foreground text-background text-[11px] font-fustat font-bold hover:opacity-90 transition-opacity"
                >
                  <PlayStoreIcon className="h-3.5 w-3.5" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] font-normal opacity-70">حمّل من</span>
                    <span>Google Play</span>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 left-3 p-1 text-muted-foreground/40 hover:text-foreground transition-colors rounded-full"
            aria-label="إغلاق"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feature pills */}
        <div className="px-4 pb-3.5 flex items-center gap-1.5 flex-wrap">
          {[
            { icon: WifiOff, label: "استماع بدون انترنت" },
            { icon: Smartphone, label: "تجربة أسرع وأنعم" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 text-[10px] font-fustat text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full"
            >
              <Icon className="h-2.5 w-2.5" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main TrackPage ──

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playTrack, nowPlayingId, isFavorite, toggleFavorite } = usePlayer();
  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  const { data: track, isLoading, error } = useMadha(id);
  const { data: moreTracks } = useMadhaatByMadih(track?.madih_id || undefined);

  // Filter out current track from "more by this artist"
  const relatedTracks = (moreTracks || []).filter((t) => t.id !== id).slice(0, 6);
  const isPlaying = nowPlayingId === id;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="font-fustat text-xs text-muted-foreground">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div className="h-20 w-20 rounded-full bg-muted/60 flex items-center justify-center">
          <span className="text-3xl">🎵</span>
        </div>
        <p className="font-fustat text-lg font-bold text-foreground">هذه المدحة غير متوفرة</p>
        <p className="text-sm text-muted-foreground">ربما تم حذفها أو الرابط غير صحيح</p>
        <Button variant="outline" onClick={() => navigate("/")} className="font-fustat mt-2 rounded-full">
          العودة للرئيسية
        </Button>
      </motion.div>
    );
  }

  const imageUrl = getImageUrl(track.image_url || track.madiheen?.image_url);
  const artistName = track.madiheen?.name || track.madih || "غير معروف";
  const pageTitle = `${track.title} — ${artistName} | رنّة`;
  const lyricsSnippet = track.lyrics ? track.lyrics.substring(0, 160).replace(/\n/g, " ") : "";
  const pageDesc = lyricsSnippet
    ? `${track.title} — ${artistName} | ${lyricsSnippet}`
    : `استمع إلى "${track.title}" للمادح ${artistName} على رنّة — منصة المدائح النبوية السودانية`;
  const narratorName = track.ruwat?.name || track.writer;
  const tariqaName = track.turuq?.name;
  const fanName = track.funun?.name;
  const duration = formatDuration(track.duration_seconds);
  const shareUrl = getTrackShareUrl(track.id);
  const shareTitle = `${track.title} — ${artistName} | رنّة`;
  const allQueue = [track.id, ...relatedTracks.map((t) => t.id)];

  // Lyrics: collapse if > 8 lines, show a preview
  const lyricsLines = track.lyrics?.split("\n") || [];
  const hasLongLyrics = lyricsLines.length > 12;
  const visibleLyrics = hasLongLyrics && !lyricsExpanded
    ? lyricsLines.slice(0, 10).join("\n")
    : track.lyrics;

  // JSON-LD structured data for search engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: track.title,
    url: shareUrl,
    inLanguage: "ar",
    ...(track.duration_seconds && {
      duration: `PT${Math.floor(track.duration_seconds / 60)}M${track.duration_seconds % 60}S`,
    }),
    ...(imageUrl && { image: imageUrl }),
    ...(artistName && { byArtist: { "@type": "MusicGroup", name: artistName } }),
    isAccessibleForFree: true,
    ...(track.lyrics && {
      recordingOf: {
        "@type": "MusicComposition",
        name: track.title,
        lyrics: { "@type": "CreativeWork", text: track.lyrics },
        inLanguage: "ar",
      },
    }),
  };

  const handlePlay = () => {
    playTrack(track.id, allQueue);
  };

  return (
    <div dir="rtl">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={shareUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="music.song" />
        <meta property="og:url" content={shareUrl} />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ── Hero Section with parallax-style image ── */}
      <div className="relative overflow-hidden">
        {/* Background image — blurred for ambient effect */}
        <div className="absolute inset-0 scale-110">
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover blur-xl opacity-30"
          />
        </div>

        {/* Main image */}
        <div className="relative h-80 w-full md:h-96">
          <img
            src={imageUrl}
            alt={track.title}
            className="h-full w-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent h-24" />
        </div>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="absolute top-10 right-4 z-10 h-9 w-9 rounded-full bg-background/50 backdrop-blur-md text-foreground hover:bg-background/70 border border-border/30"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Title overlay — positioned at the bottom of the hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="absolute bottom-0 right-0 left-0 px-5 pb-5"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            {tariqaName && (
              <span className="text-[9px] font-fustat bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                {tariqaName}
              </span>
            )}
            {fanName && (
              <span className="text-[9px] font-fustat bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/10">
                {fanName}
              </span>
            )}
          </div>

          <h1 className="font-fustat text-2xl font-extrabold text-foreground md:text-3xl leading-tight">
            {track.title}
          </h1>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link
              to={`/profile/artist/${track.madih_id}`}
              className="font-fustat font-semibold text-foreground/80 hover:text-accent transition-colors"
            >
              {artistName}
            </Link>
            {narratorName && (
              <>
                <span className="opacity-30">·</span>
                <span>رواية: {narratorName}</span>
              </>
            )}
            {duration && duration !== "0:00" && (
              <>
                <span className="opacity-30">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duration}
                </span>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Actions Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-2 px-5 py-4"
      >
        {/* Play button — prominent */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={handlePlay}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
            isPlaying
              ? "bg-accent text-accent-foreground shadow-glow-accent"
              : "bg-primary text-primary-foreground hover:shadow-lg"
          }`}
        >
          <RtlPlay className="h-5 w-5" fill="currentColor" />
        </motion.button>

        {/* Favorite */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-full transition-all duration-200 ${
            isFavorite(track.id)
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          onClick={() => toggleFavorite(track.id)}
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill={isFavorite(track.id) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            whileTap={{ scale: 1.3 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </motion.svg>
        </Button>

        {/* Share */}
        <ShareButton url={shareUrl} title={shareTitle} />

        <div className="flex-1" />

        {/* Now playing indicator */}
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full"
          >
            <div className="flex items-end gap-[2px] h-3">
              <div className="w-[2px] rounded-full bg-accent animate-eq-1" />
              <div className="w-[2px] rounded-full bg-accent animate-eq-2" />
              <div className="w-[2px] rounded-full bg-accent animate-eq-3" />
            </div>
            <span className="text-[10px] font-fustat font-bold">يعمل الآن</span>
          </motion.div>
        )}
      </motion.div>

      {/* ── App Download Banner ── */}
      <AppDownloadBanner />

      {/* ── Lyrics Section ── */}
      {track.lyrics && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="px-5 pb-5"
        >
          <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
            {/* Subtle decorative corner */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/[0.04] to-transparent pointer-events-none" />

            <div className="p-5 space-y-3 relative">
              <div className="flex items-center justify-between">
                <h3 className="font-fustat text-sm font-bold text-primary flex items-center gap-2">
                  <span className="inline-block w-1 h-4 rounded-full bg-accent" />
                  كلمات المدحة
                </h3>
                {hasLongLyrics && (
                  <button
                    onClick={() => setLyricsExpanded(!lyricsExpanded)}
                    className="text-[11px] font-fustat text-accent flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                  >
                    {lyricsExpanded ? "عرض أقل" : "عرض الكل"}
                    {lyricsExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>

              <div className="h-px bg-border/60" />

              <div className="relative">
                <p className="font-panorama text-base leading-[2.2] whitespace-pre-line text-foreground/80">
                  {visibleLyrics}
                </p>

                {/* Fade out effect when collapsed */}
                {hasLongLyrics && !lyricsExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                )}
              </div>

              {hasLongLyrics && !lyricsExpanded && (
                <button
                  onClick={() => setLyricsExpanded(true)}
                  className="w-full py-2 text-xs font-fustat font-bold text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-1"
                >
                  عرض كل الكلمات
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Track Details Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-5 pb-5"
      >
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <h3 className="font-fustat text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <span className="inline-block w-1 h-4 rounded-full bg-primary/30" />
            تفاصيل المدحة
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[10px] font-fustat text-muted-foreground/60 uppercase">المادح</p>
              <Link
                to={`/profile/artist/${track.madih_id}`}
                className="text-xs font-fustat font-semibold text-foreground hover:text-accent transition-colors"
              >
                {artistName}
              </Link>
            </div>
            {narratorName && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-fustat text-muted-foreground/60 uppercase">الراوي</p>
                <p className="text-xs font-fustat font-semibold text-foreground">{narratorName}</p>
              </div>
            )}
            {tariqaName && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-fustat text-muted-foreground/60 uppercase">الطريقة</p>
                <p className="text-xs font-fustat font-semibold text-foreground">{tariqaName}</p>
              </div>
            )}
            {fanName && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-fustat text-muted-foreground/60 uppercase">الفن</p>
                <p className="text-xs font-fustat font-semibold text-foreground">{fanName}</p>
              </div>
            )}
            {duration && duration !== "0:00" && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-fustat text-muted-foreground/60 uppercase">المدة</p>
                <p className="text-xs font-fustat font-semibold text-foreground">{duration}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── More by this Artist ── */}
      {relatedTracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-5 pb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-fustat text-base font-bold flex items-center gap-2">
              <span className="inline-block w-1 h-4 rounded-full bg-secondary/60" />
              المزيد من {artistName}
            </h3>
            {track.madih_id && (
              <Link
                to={`/profile/artist/${track.madih_id}`}
                className="font-fustat text-xs text-accent hover:text-accent/80 transition-colors"
              >
                عرض الكل ←
              </Link>
            )}
          </div>
          <div className="space-y-0.5">
            {relatedTracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} contextQueue={allQueue} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Bottom spacing for mini player */}
      <div className="h-40" />
    </div>
  );
}
