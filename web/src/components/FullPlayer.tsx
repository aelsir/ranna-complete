import { ChevronDown, Heart, Pause, RotateCcw, RotateCw } from "lucide-react";
import { RtlPlay, RtlSkipBack, RtlSkipForward } from "@/components/icons/rtl-icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import { useMadha } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";

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
  } = usePlayer();

  const { data: track } = useMadha(nowPlayingId ?? undefined);

  const coverImage = track ? getImageUrl(track.image_url) : "";
  const artistImage = track?.madiheen ? getImageUrl(track.madiheen.image_url) : "";
  const displayImage = coverImage || artistImage;
  const trackTitle = track?.title || "";
  const artistName = track?.madiheen?.name || track?.madih || "";
  const narratorName = track?.ruwat?.name || track?.writer || "";

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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex items-center justify-between px-5 pt-5 pb-2"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullPlayerOpen(false)}
              className="h-10 w-10 rounded-full text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5 active:scale-90 transition-transform"
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
            <span className="font-fustat text-xs font-bold text-primary-foreground/50">الآن يُستمع</span>
            <div className="w-10" /> {/* Spacer for centering */}
          </motion.div>

          {/* Cover Art */}
          <div className="flex-1 flex items-center justify-center px-8 py-4 min-h-0">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
              className="relative w-full max-w-[280px] aspect-square"
            >
              {/* Glow behind cover */}
              <div className="absolute inset-0 rounded-2xl bg-accent/15 blur-2xl scale-110" />
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={trackTitle}
                  className="relative w-full h-full rounded-2xl object-cover shadow-lg ring-1 ring-primary-foreground/10"
                />
              ) : (
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-accent/20 via-primary/30 to-secondary/10 flex items-center justify-center shadow-lg ring-1 ring-primary-foreground/10">
                  <span className="font-fustat text-6xl font-bold text-primary-foreground/20">
                    {trackTitle?.[0]}
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Track Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="px-8 text-center space-y-1"
          >
            <h2 className="font-fustat text-xl font-bold text-primary-foreground truncate">
              {trackTitle}
            </h2>
            <p className="font-fustat text-sm text-primary-foreground/50 truncate">
              {artistName}
              {narratorName ? ` · ${narratorName}` : ""}
            </p>
          </motion.div>

          {/* Progress */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="px-8 pt-6 pb-2 space-y-2"
          >
            <Slider
              dir="rtl"
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="h-6 [&>span:first-child]:h-1.5 [&>span:first-child]:rounded-full [&>span:first-child]:bg-primary-foreground/15 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:bg-accent [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-glow-accent [&>span:first-child>span]:bg-accent [&>span:first-child>span]:rounded-full"
            />
            <div className="flex justify-between">
              <span className="text-[11px] text-primary-foreground/40 tabular-nums font-fustat">
                {formatTime(duration)}
              </span>
              <span className="text-[11px] text-primary-foreground/40 tabular-nums font-fustat">
                {formatTime(currentTime)}
              </span>
            </div>
          </motion.div>

          {/* Main Controls */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center justify-center gap-3 px-8 pb-2"
          >
            <Button
              onClick={skipBackward15s}
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/5 active:scale-90 transition-transform"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => playPrevious()}
              disabled={!hasPrevious}
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5 active:scale-90 transition-transform disabled:opacity-30"
            >
              <RtlSkipBack className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              onClick={togglePlay}
              className="h-16 w-16 rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-glow-accent active:scale-90 transition-transform flex-shrink-0"
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <Pause className="h-7 w-7" fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <RtlPlay className="h-7 w-7" fill="currentColor" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            <Button
              onClick={() => playNext()}
              disabled={!hasNext}
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5 active:scale-90 transition-transform disabled:opacity-30"
            >
              <RtlSkipForward className="h-6 w-6" />
            </Button>
            <Button
              onClick={skipForward15s}
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/5 active:scale-90 transition-transform"
            >
              <RotateCw className="h-5 w-5" />
            </Button>
          </motion.div>

          {/* Secondary Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="flex items-center justify-center pb-6 pt-2"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => nowPlayingId && toggleFavorite(nowPlayingId)}
              className="h-10 w-10 rounded-full hover:bg-primary-foreground/5 active:scale-90 transition-transform"
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
                    className={`h-5 w-5 transition-colors ${
                      nowPlayingId && isFavorite(nowPlayingId)
                        ? "text-red-500 fill-red-500"
                        : "text-primary-foreground/30 hover:text-primary-foreground/60"
                    }`}
                  />
                </motion.div>
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullPlayer;
