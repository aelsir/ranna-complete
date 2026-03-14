import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback, useMemo } from "react";

interface PlayerContextType {
  // Queue & track
  nowPlayingId: string | null;
  queue: string[];
  currentIndex: number;
  playTrack: (id: string, newQueue?: string[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;

  // Audio state (shared between MiniPlayer & FullPlayer)
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  togglePlay: () => void;
  seekTo: (percent: number) => void;
  skipForward15s: () => void;
  skipBackward15s: () => void;

  // Full player
  isFullPlayerOpen: boolean;
  setFullPlayerOpen: (open: boolean) => void;

  // Favorites
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("ranna_favorites");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Full player state
  const [isFullPlayerOpen, setFullPlayerOpen] = useState(false);

  const lastSaveRef = useRef<number>(0);

  const nowPlayingId = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < queue.length) {
      return queue[currentIndex];
    }
    return null;
  }, [queue, currentIndex]);

  const currentTime = duration ? (progress / 100) * duration : 0;

  // Audio control methods
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekTo = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = (percent / 100) * audio.duration;
    setProgress(percent);
  }, []);

  const skipForward15s = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(audio.currentTime + 15, audio.duration);
  }, []);

  const skipBackward15s = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 15, 0);
  }, []);

  // Favorites
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      try {
        localStorage.setItem("ranna_favorites", JSON.stringify(Array.from(next)));
      } catch (error) {
        console.error("Failed to save favorites to localStorage", error);
      }

      return next;
    });
  }, []);

  // Queue controls
  const playTrack = useCallback((id: string, newQueue?: string[]) => {
    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const index = newQueue.indexOf(id);
      setCurrentIndex(index >= 0 ? index : 0);
    } else {
      setQueue((prevQueue) => {
        const index = prevQueue.indexOf(id);
        if (index >= 0) {
          setCurrentIndex(index);
          return prevQueue;
        }
        setCurrentIndex(0);
        return [id];
      });
    }
  }, []);

  const playNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < queue.length - 1 ? prev + 1 : prev));
  }, [queue.length]);

  const playPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const hasNext = queue.length > 0 && currentIndex < queue.length - 1;
  const hasPrevious = queue.length > 0 && currentIndex > 0;

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  // Audio event listeners — progress tracking, auto-advance
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration && isFinite(audio.duration)) {
        const currentProgress = (audio.currentTime / audio.duration) * 100;
        setProgress(currentProgress);

        const now = Date.now();
        if (now - lastSaveRef.current > 5000 && nowPlayingId) {
          try {
            // Save continue listening progress
            const raw = localStorage.getItem("ranna_continue_listening");
            let list = raw ? JSON.parse(raw) : [];
            list = list.filter((item: any) => item.trackId !== nowPlayingId);
            
            // Only save if progress is < 95% to avoid keeping finished tracks
            if (currentProgress < 95) {
              list.unshift({
                trackId: nowPlayingId,
                progress: currentProgress,
                duration: audio.duration,
                timestamp: now
              });
              list = list.slice(0, 4);
              localStorage.setItem("ranna_continue_listening", JSON.stringify(list));
            } else {
              // If finished, remove it out of continue listening
              localStorage.setItem("ranna_continue_listening", JSON.stringify(list));
            }
            lastSaveRef.current = now;
          } catch (error) {
            console.error("Failed to save progress", error);
          }
        }

        if ("mediaSession" in navigator && navigator.mediaSession.setPositionState) {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        }
      }
    };

    const onLoaded = () => {
      setDuration(audio.duration);
      try {
        const raw = localStorage.getItem("ranna_continue_listening");
        if (raw && nowPlayingId) {
          const list = JSON.parse(raw);
          const saved = list.find((item: any) => item.trackId === nowPlayingId);
          // If we have saved progress, and it's less than 95%, resume from there.
          if (saved && saved.progress > 0 && saved.progress < 95 && audio.currentTime < 1) {
            const seekTime = (saved.progress / 100) * audio.duration;
            audio.currentTime = seekTime;
            setProgress(saved.progress);
          }
        }
      } catch (e) {
        console.error("Failed to resume progress", e);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      if (hasNext) {
        playNext();
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [hasNext, playNext, nowPlayingId]);

  return (
    <PlayerContext.Provider
      value={{
        nowPlayingId,
        queue,
        currentIndex,
        playTrack,
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
        favorites,
        toggleFavorite,
        isFavorite
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};
