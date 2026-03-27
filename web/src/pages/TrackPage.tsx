import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Clock, Loader2 } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMadha, useMadhaatByMadih } from "@/lib/api/hooks";
import { getImageUrl, formatDuration } from "@/lib/format";
import { usePlayer } from "@/context/PlayerContext";
import { ShareButton } from "@/components/ShareButton";
import { getTrackShareUrl } from "@/lib/share";
import TrackRow from "@/components/TrackRow";

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playTrack, nowPlayingId, isFavorite, toggleFavorite } = usePlayer();

  const { data: track, isLoading, error } = useMadha(id);
  const { data: moreTracks } = useMadhaatByMadih(track?.madih_id || undefined);

  // Filter out current track from "more by this artist"
  const relatedTracks = (moreTracks || []).filter((t) => t.id !== id).slice(0, 5);
  const isPlaying = nowPlayingId === id;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-fustat text-lg font-bold text-foreground">هذه المدحة غير متوفرة</p>
        <p className="text-sm text-muted-foreground">ربما تم حذفها أو الرابط غير صحيح</p>
        <Button variant="outline" onClick={() => navigate("/")} className="font-fustat mt-2">
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  const imageUrl = getImageUrl(track.image_url || track.madiheen?.image_url);
  const artistName = track.madiheen?.name || track.madih || "غير معروف";
  const pageTitle = `${track.title} — ${artistName} | رنّة`;
  const pageDesc = `استمع إلى "${track.title}" للمادح ${artistName} على رنّة`;
  const narratorName = track.ruwat?.name || track.writer;
  const tariqaName = track.turuq?.name;
  const fanName = track.funun?.name;
  const duration = formatDuration(track.duration_seconds);
  const shareUrl = getTrackShareUrl(track.id);
  const shareTitle = `${track.title} — ${artistName} | رنّة`;
  const allQueue = [track.id, ...relatedTracks.map((t) => t.id)];

  const handlePlay = () => {
    playTrack(track.id, allQueue);
  };

  return (
    <div dir="rtl">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>
      {/* Hero / Header */}
      <div className="relative">
        <div className="h-72 w-full overflow-hidden md:h-80">
          <img
            src={imageUrl}
            alt={track.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-10 right-4 z-10 h-8 w-8 rounded-full bg-background/40 backdrop-blur-sm text-foreground hover:bg-background/60"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Title overlay */}
        <div className="absolute bottom-0 right-0 left-0 px-5 pb-4">
          <p className="font-fustat text-[10px] font-bold uppercase tracking-wider text-muted-foreground">مدحة</p>
          <h1 className="font-fustat text-2xl font-extrabold text-foreground md:text-3xl leading-tight">{track.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link
              to={`/profile/artist/${track.madih_id}`}
              className="hover:text-foreground transition-colors"
            >
              {artistName}
            </Link>
            {narratorName && (
              <>
                <span className="opacity-40">•</span>
                <span>رواية: {narratorName}</span>
              </>
            )}
            {duration && duration !== "0:00" && (
              <>
                <span className="opacity-40">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duration}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3 px-5 py-3">
        <motion.div whileTap={{ scale: 0.92 }}>
          <Button
            onClick={handlePlay}
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full hover:scale-105 active:scale-95 transition-transform"
          >
            <RtlPlay className="h-5 w-5" fill="currentColor" />
          </Button>
        </motion.div>

        <Button
          variant="ghost"
          size="icon"
          className={`text-muted-foreground hover:text-foreground ${isFavorite(track.id) ? "text-accent" : ""}`}
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

        <ShareButton url={shareUrl} title={shareTitle} />

        <div className="flex-1" />

        {/* Metadata badges */}
        <div className="flex items-center gap-1.5">
          {tariqaName && (
            <span className="text-[10px] font-fustat bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {tariqaName}
            </span>
          )}
          {fanName && (
            <span className="text-[10px] font-fustat bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {fanName}
            </span>
          )}
        </div>
      </div>

      {/* Lyrics section */}
      {track.lyrics && (
        <div className="px-5 pb-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-fustat text-sm font-bold text-primary">كلمات المدحة</h3>
            <div className="h-px bg-border" />
            <p className="font-naskh text-base leading-[2.2] whitespace-pre-line text-foreground/80">
              {track.lyrics}
            </p>
          </div>
        </div>
      )}

      {/* More by this artist */}
      {relatedTracks.length > 0 && (
        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-fustat text-base font-bold">المزيد من {artistName}</h3>
            {track.madih_id && (
              <Link
                to={`/profile/artist/${track.madih_id}`}
                className="font-fustat text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                عرض الكل
              </Link>
            )}
          </div>
          <div className="space-y-0.5">
            {relatedTracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i + 1} contextQueue={allQueue} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom spacing for mini player */}
      <div className="h-24" />
    </div>
  );
}
