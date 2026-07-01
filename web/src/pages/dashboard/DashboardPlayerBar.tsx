/**
 * Docked player bar for the dashboard.
 *
 * Unlike the app's floating MiniPlayer (hidden on /dashboard), this bar is a
 * normal flex child at the bottom of the dashboard layout — the track list
 * shrinks to make room, so the player never covers any rows. Playback itself
 * still runs through the global <audio> element in MiniPlayer.
 */

import { Pause, Play, SkipBack, SkipForward, RotateCcw, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import { useMadha } from "@/lib/api/hooks";
import { getTrackDisplayImage } from "@/lib/format";

function formatTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function DashboardPlayerBar() {
  const {
    nowPlayingId,
    isPlaying,
    togglePlay,
    progress,
    duration,
    currentTime,
    seekTo,
    skipForward15s,
    skipBackward15s,
    playNext,
    playPrevious,
    hasNext,
    hasPrevious,
  } = usePlayer();

  const { data: track } = useMadha(nowPlayingId ?? undefined);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // RTL: playback progress grows right-to-left.
    const ratio = (rect.right - e.clientX) / rect.width;
    seekTo(Math.min(100, Math.max(0, ratio * 100)));
  };

  return (
    <AnimatePresence>
      {nowPlayingId && track && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 border-t border-border bg-card overflow-hidden"
        >
          <div className="flex items-center gap-4 px-6 py-2.5">
            {/* Track info */}
            <img
              src={getTrackDisplayImage(track)}
              alt={track.title}
              className="h-10 w-10 rounded-lg object-cover shrink-0"
            />
            <div className="w-48 min-w-0 shrink-0">
              <p className="truncate font-fustat text-sm font-bold text-foreground">{track.title}</p>
              <p className="truncate font-fustat text-[11px] text-muted-foreground">
                {track.madiheen?.name || track.madih || ""}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={playPrevious}
                disabled={!hasPrevious}
                className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                title="السابق"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                onClick={skipBackward15s}
                className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                title="١٥ ثانية للخلف"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={togglePlay}
                className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4 -scale-x-100" fill="currentColor" />
                )}
              </button>
              <button
                onClick={skipForward15s}
                className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                title="١٥ ثانية للأمام"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={playNext}
                disabled={!hasNext}
                className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                title="التالي"
              >
                <SkipBack className="h-4 w-4" />
              </button>
            </div>

            {/* Seek bar */}
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-10 text-center" dir="ltr">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-6 flex items-center cursor-pointer group"
              onClick={handleSeek}
            >
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary group-hover:bg-primary/80 transition-colors"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-10 text-center" dir="ltr">
              {formatTime(duration)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
