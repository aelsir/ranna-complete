import { useState, useEffect } from "react";
import { ChevronDown, Heart, Pause, Shuffle, Repeat, Repeat1, Timer, BookOpenText } from "lucide-react";
import { RtlPlay, RtlSkipBack, RtlSkipForward } from "@/components/icons/rtl-icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import { useMadha } from "@/lib/api/hooks";
import { getTrackDisplayImage } from "@/lib/format";
import { ShareButton } from "@/components/ShareButton";
import { getTrackShareUrl } from "@/lib/share";

const SLEEP_OPTIONS = [
  { label: "١٥ دقيقة", minutes: 15 },
  { label: "٣٠ دقيقة", minutes: 30 },
  { label: "٤٥ دقيقة", minutes: 45 },
  { label: "٦٠ دقيقة", minutes: 60 },
];

/* ── Custom 15-second skip icons with the "15" label ── */
const Skip15Back = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.5 4 5 8l4.5 4" />
    <path d="M5 8h8a5 5 0 0 1 0 10h-1" />
    <text x="8.5" y="17.5" fontSize="7.5" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="sans-serif">15</text>
  </svg>
);

const Skip15Forward = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} style={{ transform: "scaleX(-1)" }}>
    <path d="M9.5 4 5 8l4.5 4" />
    <path d="M5 8h8a5 5 0 0 1 0 10h-1" />
    <text x="8.5" y="17.5" fontSize="7.5" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="sans-serif" style={{ transform: "scaleX(-1)", transformOrigin: "8.5px 14px" }}>15</text>
  </svg>
);

const FullPlayer = () => {
  const {
    nowPlayingId,
    playNext,
    playPrevious,
    hasNext,
    hasPrevious,
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
    repeatMode,
    cycleRepeat,
    sleepMinutes,
    sleepEndTime,
    setSleepTimer,
  } = usePlayer();

  const { data: track } = useMadha(nowPlayingId ?? undefined);
  const [showLyrics, setShowLyrics] = useState(false);

  // Listen for mini player lyrics button event
  useEffect(() => {
    const handler = () => setShowLyrics(true);
    window.addEventListener("ranna:show-lyrics", handler);
    return () => window.removeEventListener("ranna:show-lyrics", handler);
  }, []);

  const displayImage = getTrackDisplayImage(track);
  const trackTitle = track?.title || "";
  const artistName = track?.madiheen?.name || track?.madih || "";
  const narratorName = track?.ruwat?.name || track?.writer || "";
  const hasLyrics = !!track?.lyrics;

  const sleepRemaining = sleepEndTime ? Math.max(0, Math.ceil((sleepEndTime - Date.now()) / 60000)) : null;

  const handleSeek = (value: number[]) => seekTo(value[0]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const repeatActive = repeatMode !== "off";

  return (
    <AnimatePresence>
      {isFullPlayerOpen && nowPlayingId && track && (
        <motion.div
          key="full-player"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed left-3 right-3 top-2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[55] rounded-3xl glass-dark shadow-float overflow-hidden border border-primary-foreground/5 flex flex-col"
        >
          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullPlayerOpen(false)}
              className="h-10 w-10 rounded-full bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 active:scale-90 transition-transform backdrop-blur-sm"
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
            <span className="font-fustat text-xs font-bold text-primary-foreground/50">الآن يُستمع</span>
            <div className="w-10" />
          </motion.div>

          {/* ── Cover Art / Lyrics ── */}
          <div className="flex-1 flex items-center justify-center px-8 py-3 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {showLyrics && hasLyrics ? (
                <motion.div
                  key="lyrics"
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full overflow-y-auto rounded-2xl bg-primary-foreground/5 p-5 ring-1 ring-primary-foreground/10"
                  onClick={() => setShowLyrics(false)}
                >
                  <p className="font-panorama text-base leading-[2.2] whitespace-pre-line text-primary-foreground/80 text-center">
                    {track.lyrics}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="cover"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="relative w-full max-w-[280px] max-h-[min(280px,35vh)] aspect-square"
                >
                  <div className="absolute inset-0 rounded-2xl bg-accent/15 blur-2xl scale-110" />
                  <img
                    src={displayImage}
                    alt={trackTitle}
                    className="relative w-full h-full rounded-2xl object-cover shadow-lg ring-1 ring-primary-foreground/10"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Track Info ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="px-8 text-center space-y-1 shrink-0"
          >
            <h2 className="font-fustat text-xl font-bold text-primary-foreground truncate">
              {trackTitle}
            </h2>
            <p className="font-fustat text-sm text-primary-foreground/50 truncate">
              {artistName}
              {narratorName ? ` · ${narratorName}` : ""}
            </p>
          </motion.div>

          {/* ── Action Buttons (Repeat, Favorite, Share, Lyrics, Timer) ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex items-center justify-center gap-2 pt-4 pb-2 shrink-0"
          >
            {/* Repeat */}
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleRepeat}
              className={`h-11 w-11 rounded-full hover:bg-primary-foreground/10 active:scale-90 transition-transform ${
                repeatActive ? "text-accent" : "text-primary-foreground/50 hover:text-primary-foreground/80"
              }`}
            >
              <RepeatIcon className="h-5.5 w-5.5" strokeWidth={2} />
            </Button>

            {/* Favorite */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => nowPlayingId && toggleFavorite(nowPlayingId)}
              className="h-11 w-11 rounded-full hover:bg-primary-foreground/10 active:scale-90 transition-transform"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={nowPlayingId && isFavorite(nowPlayingId) ? "filled" : "empty"}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Heart
                    className={`h-5.5 w-5.5 transition-colors ${
                      nowPlayingId && isFavorite(nowPlayingId)
                        ? "text-red-500 fill-red-500"
                        : "text-primary-foreground/50 hover:text-primary-foreground/80"
                    }`}
                  />
                </motion.div>
              </AnimatePresence>
            </Button>

            {/* Share */}
            {nowPlayingId && (
              <ShareButton
                url={getTrackShareUrl(nowPlayingId)}
                title={`${track?.title || ""} | رنّة`}
                className="h-11 w-11 rounded-full hover:bg-primary-foreground/10 text-primary-foreground/50 hover:text-primary-foreground/80"
              />
            )}

            {/* Lyrics */}
            {hasLyrics && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLyrics(!showLyrics)}
                className={`h-11 w-11 rounded-full hover:bg-primary-foreground/10 active:scale-90 transition-transform ${
                  showLyrics ? "text-accent" : "text-primary-foreground/50 hover:text-primary-foreground/80"
                }`}
              >
                <BookOpenText className="h-5.5 w-5.5" strokeWidth={2} />
              </Button>
            )}

            {/* Sleep Timer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`relative h-11 w-11 rounded-full hover:bg-primary-foreground/10 active:scale-90 transition-transform ${
                    sleepMinutes ? "text-accent" : "text-primary-foreground/50 hover:text-primary-foreground/80"
                  }`}
                >
                  <Timer className="h-5.5 w-5.5" strokeWidth={2} />
                  {sleepRemaining !== null && sleepRemaining > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-accent text-primary text-[8px] font-fustat font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {sleepRemaining}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="font-fustat text-sm min-w-[140px]" dir="rtl">
                {SLEEP_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.minutes} onClick={() => setSleepTimer(opt.minutes)} className="cursor-pointer justify-center">
                    {opt.label}
                  </DropdownMenuItem>
                ))}
                {sleepMinutes && (
                  <DropdownMenuItem onClick={() => setSleepTimer(null)} className="cursor-pointer justify-center text-destructive">
                    إيقاف المؤقت
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>

          {/* ── Progress Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="px-8 pt-2 pb-2 space-y-2 shrink-0"
          >
            <Slider
              dir="rtl"
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="h-6 [&>span:first-child]:h-[3px] [&>span:first-child]:rounded-full [&>span:first-child]:bg-primary-foreground/15 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-primary-foreground [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-md [&>span:first-child>span]:bg-primary-foreground [&>span:first-child>span]:rounded-full"
            />
            <div className="flex justify-between">
              <span className="text-[11px] text-primary-foreground/40 tabular-nums font-fustat">
                {formatTime(currentTime)}
              </span>
              <span className="text-[11px] text-primary-foreground/40 tabular-nums font-fustat">
                {formatTime(duration)}
              </span>
            </div>
          </motion.div>

          {/* ── Main Playback Controls ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="flex items-center justify-center gap-4 px-8 pb-6 shrink-0"
          >
            {/* Skip back 15s (uses forward-looking icon, flipped visually for RTL) */}
            <button
              onClick={skipBackward15s}
              className="h-12 w-12 flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground active:scale-90 transition-all"
            >
              <Skip15Forward className="h-7 w-7" />
            </button>

            {/* Previous */}
            <button
              onClick={() => playPrevious()}
              disabled={!hasPrevious}
              className="h-12 w-12 flex items-center justify-center text-primary-foreground/80 hover:text-primary-foreground active:scale-90 transition-all disabled:opacity-30"
            >
              <RtlSkipBack className="h-7 w-7" />
            </button>

            {/* Play/Pause */}
            <Button
              size="icon"
              onClick={togglePlay}
              className="h-[68px] w-[68px] rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-glow-accent active:scale-90 transition-transform flex-shrink-0"
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div key="pause" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.12 }}>
                    <Pause className="h-10 w-10" fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div key="play" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.12 }}>
                    <RtlPlay className="h-10 w-10" fill="currentColor" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* Next */}
            <button
              onClick={() => playNext()}
              disabled={!hasNext}
              className="h-12 w-12 flex items-center justify-center text-primary-foreground/80 hover:text-primary-foreground active:scale-90 transition-all disabled:opacity-30"
            >
              <RtlSkipForward className="h-7 w-7" />
            </button>

            {/* Skip forward 15s (uses back-looking icon, flipped visually for RTL) */}
            <button
              onClick={skipForward15s}
              className="h-12 w-12 flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground active:scale-90 transition-all"
            >
              <Skip15Back className="h-7 w-7" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullPlayer;
