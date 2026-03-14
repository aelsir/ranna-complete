import { useEffect } from "react";
import { Pause } from "lucide-react";
import { RtlPlay, RtlSkipBack, RtlSkipForward } from "@/components/icons/rtl-icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import { useMadha } from "@/lib/api/hooks";
import { getAudioUrl, getImageUrl } from "@/lib/format";

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
  } = usePlayer();

  const { data: track } = useMadha(nowPlayingId ?? undefined);

  const audioSrc = track ? getAudioUrl(track.audio_url) : "";
  const coverImage = track ? getImageUrl(track.image_url) : "";
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
          { src: coverImage || "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: coverImage || "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
        ],
      });
    }
  }, [track, trackTitle, artistName, coverImage]);

  // Load new audio when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    audio.src = audioSrc;
    audio.load();
    audio.play().catch(() => {});
  }, [audioSrc, audioRef]);

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

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div
                className="relative flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                onClick={() => setFullPlayerOpen(true)}
              >
                <div className="absolute inset-0 rounded-lg bg-accent/20 blur-md" />
                {coverImage ? (
                  <img src={coverImage} alt={trackTitle} className="relative h-11 w-11 rounded-lg object-cover" />
                ) : (
                  <div className="relative h-11 w-11 rounded-lg bg-primary/20 flex items-center justify-center">
                    <RtlPlay className="h-4 w-4 text-primary-foreground/60" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <p className="truncate font-fustat text-xs font-bold text-primary-foreground">{trackTitle}</p>
                <div className="flex items-center gap-2">
                  <Slider
                    dir="rtl"
                    value={[progress]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                    className="flex-1 h-5 [&>span:first-child]:h-1 [&>span:first-child]:rounded-full [&>span:first-child]:bg-primary-foreground/15 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:bg-accent [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-glow-accent [&>span:first-child>span]:bg-accent [&>span:first-child>span]:rounded-full"
                  />
                  <span className="text-[10px] text-primary-foreground/40 tabular-nums min-w-[2.2rem] text-left font-fustat">
                    {formatTime(currentTime)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <Button
                  onClick={() => playPrevious()}
                  disabled={!hasPrevious}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/5 active:scale-90 transition-transform disabled:opacity-30"
                >
                  <RtlSkipBack className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-md active:scale-90 transition-transform flex-shrink-0"
                >
                  <AnimatePresence mode="wait">
                    {isPlaying ? (
                      <motion.div key="pause" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.12 }}>
                        <Pause className="h-4 w-4" fill="currentColor" />
                      </motion.div>
                    ) : (
                      <motion.div key="play" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.12 }}>
                        <RtlPlay className="h-4 w-4" fill="currentColor" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
                <Button
                  onClick={() => playNext()}
                  disabled={!hasNext}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/5 active:scale-90 transition-transform disabled:opacity-30"
                >
                  <RtlSkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MiniPlayer;
