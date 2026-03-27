import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import { useMadha } from "@/lib/api/hooks";
import { getAudioUrl, getTrackDisplayImage } from "@/lib/format";
import { ShareButton } from "@/components/ShareButton";
import { getTrackShareUrl } from "@/lib/share";
import { trackEvent } from "@/lib/analytics";
import { RannaIcon } from "@/components/icons/RannaIcon";

/* ── Circular progress ring around the play button ── */
const ProgressRing = ({ progress, size = 48, stroke = 3 }: { progress: number; size?: number; stroke?: number }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90">
      {/* Background track */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-primary-foreground/10" />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-accent transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
};

const MiniPlayer = () => {
  const {
    nowPlayingId,
    playNext,
    playPrevious,
    hasNext,
    hasPrevious,
    audioRef,
    isPlaying,
    progress,
    duration,
    currentTime,
    togglePlay,
    seekTo,
    skipForward15s,
    skipBackward15s,
    isFullPlayerOpen,
    setFullPlayerOpen,
    isFavorite,
    toggleFavorite,
  } = usePlayer();

  const { data: track } = useMadha(nowPlayingId ?? undefined);

  const audioSrc = track ? getAudioUrl(track.audio_url) : "";
  const displayImage = getTrackDisplayImage(track);
  const trackTitle = track?.title || "";
  const artistName = track?.madiheen?.name || track?.madih || "";

  // Sync Media Metadata to OS Lock Screen
  useEffect(() => {
    if ("mediaSession" in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: artistName,
        album: "رنّة - للمدائح النبوية",
        artwork: [
          { src: displayImage, sizes: "512x512", type: "image/png" },
          { src: displayImage, sizes: "192x192", type: "image/png" },
        ],
      });
    }
  }, [track, trackTitle, artistName, displayImage]);

  // Load new audio when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    audio.src = audioSrc;
    audio.load();
    audio.play().catch(() => {});
    // Play event logging now handled centrally in PlayerContext
  }, [audioSrc, audioRef, nowPlayingId]);

  // Register OS Media Session Handlers
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", togglePlay);
      navigator.mediaSession.setActionHandler("pause", togglePlay);
      navigator.mediaSession.setActionHandler("seekforward", skipForward15s);
      navigator.mediaSession.setActionHandler("seekbackward", skipBackward15s);

      if (hasNext) {
        navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
      } else {
        navigator.mediaSession.setActionHandler("nexttrack", null);
      }

      if (hasPrevious) {
        navigator.mediaSession.setActionHandler("previoustrack", () => playPrevious());
      } else {
        navigator.mediaSession.setActionHandler("previoustrack", null);
      }

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        const audio = audioRef.current;
        if (audio && details.seekTime !== undefined) {
          audio.currentTime = details.seekTime;
        }
      });
    }
  }, [isPlaying, hasNext, hasPrevious, playNext, playPrevious, togglePlay, skipForward15s, skipBackward15s, audioRef]);

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      <AnimatePresence>
        {nowPlayingId && track && !isFullPlayerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-3xl glass-dark shadow-float overflow-hidden border border-primary-foreground/5"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              {/* Right (RTL): Play/Pause with circular progress */}
              <div className="relative shrink-0 h-12 w-12">
                <ProgressRing progress={progress} size={48} stroke={2.5} />
                <button
                  onClick={togglePlay}
                  className="absolute inset-[3px] flex items-center justify-center rounded-full bg-primary-foreground active:scale-90 transition-transform"
                >
                  <AnimatePresence mode="wait">
                    {isPlaying ? (
                      <motion.div key="pause" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.12 }}>
                        <RannaIcon name="pause" size={20} className="text-white" />
                      </motion.div>
                    ) : (
                      <motion.div key="play" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.12 }}>
                        <RannaIcon name="play" size={20} className="text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Center: Title + Artist (taps to open full player) */}
              <div
                className="flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => {
                  setFullPlayerOpen(true);
                  trackEvent("full_player_opened", { track_id: nowPlayingId });
                }}
              >
                <p className="truncate font-fustat text-xs font-bold text-primary-foreground text-right">{trackTitle}</p>
                <p className="truncate font-fustat text-[10px] text-primary-foreground/40 text-right">{artistName}</p>
              </div>

              {/* Left (RTL): Love + Share + Lyrics */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (nowPlayingId) toggleFavorite(nowPlayingId);
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-full active:scale-90 transition-transform"
                >
                  <RannaIcon
                    name="love"
                    size={22}
                    className={`transition-colors ${
                      nowPlayingId && isFavorite(nowPlayingId)
                        ? "text-red-500"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  />
                </button>
                {nowPlayingId && (
                  <ShareButton
                    url={getTrackShareUrl(nowPlayingId)}
                    title={`${trackTitle} | رنّة`}
                    className="h-9 w-9 rounded-full text-primary-foreground/40 hover:text-primary-foreground/70"
                  />
                )}
                {track?.lyrics && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullPlayerOpen(true);
                      trackEvent("lyrics_viewed", { track_id: nowPlayingId, source: "mini_player" });
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("ranna:show-lyrics"));
                      }, 100);
                    }}
                    className="h-9 w-9 flex items-center justify-center rounded-full active:scale-90 transition-transform"
                  >
                    <RannaIcon name="lyrics" size={22} className="text-white/40 hover:text-white/70" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MiniPlayer;
