import { Heart, BookOpen } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import type { MadhaWithRelations } from "@/types/database";
import { formatDuration, getImageUrl } from "@/lib/format";

const Equalizer = () => (
  <div className="flex items-end gap-[2px] h-4">
    <div className="w-[3px] rounded-full bg-accent animate-eq-1" />
    <div className="w-[3px] rounded-full bg-accent animate-eq-2" />
    <div className="w-[3px] rounded-full bg-accent animate-eq-3" />
  </div>
);

interface TrackRowProps {
  track: MadhaWithRelations;
  index: number;
  animate?: boolean;
  contextQueue?: string[];
}

const TrackRow = ({ track, index, animate = true, contextQueue }: TrackRowProps) => {
  const { nowPlayingId, playTrack, isFavorite, toggleFavorite } = usePlayer();
  const isNowPlaying = track.id === nowPlayingId;
  const duration = formatDuration(track.duration_seconds);
  const thumbSrc = track.image_url || track.madiheen?.image_url;

  const content = (
    <div
      className={`group flex items-center gap-3 py-3.5 cursor-pointer rounded-xl px-3 -mx-1 transition-colors duration-200 ${
        isNowPlaying ? "bg-accent/8" : "hover:bg-muted/60"
      }`}
      onClick={() => playTrack(track.id, contextQueue)}
    >
      {isNowPlaying ? (
        <span className="w-5 flex items-center justify-center flex-shrink-0">
          <Equalizer />
        </span>
      ) : (
        <>
          <span className="font-fustat text-sm font-bold text-muted-foreground/50 w-5 text-center flex-shrink-0 group-hover:hidden tabular-nums">
            {index + 1}
          </span>
          <span className="hidden group-hover:flex flex-shrink-0 w-5 items-center justify-center text-accent">
            <RtlPlay className="h-3.5 w-3.5" fill="currentColor" />
          </span>
        </>
      )}
      {thumbSrc ? (
        <img
          src={getImageUrl(thumbSrc)}
          alt={track.title}
          className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="font-fustat text-xs font-bold text-accent/60">{track.title?.[0]}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className={`font-fustat text-sm font-bold truncate transition-colors duration-200 ${
            isNowPlaying ? "text-accent" : "group-hover:text-accent"
          }`}
        >
          {track.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {track.madiheen?.name || track.madih || ""} · {track.ruwat?.name || track.writer || ""}
        </p>
      </div>
      {track.lyrics && (
        <BookOpen className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" strokeWidth={1.5} />
      )}
      {duration && (
        <span className="text-[11px] text-muted-foreground/50 flex-shrink-0 tabular-nums">{duration}</span>
      )}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(track.id);
        }}
        className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isFavorite(track.id) ? "filled" : "empty"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite(track.id)
                  ? "text-red-500 fill-red-500"
                  : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
              }`}
            />
          </motion.div>
        </AnimatePresence>
      </button>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: index * 0.04 }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      {content}
    </motion.div>
  );
};

export default TrackRow;
