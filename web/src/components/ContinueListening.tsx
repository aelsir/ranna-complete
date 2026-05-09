import { useEffect, useState } from "react";
import { useMadhaatByIds } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";
import { usePlayer } from "@/context/PlayerContext";
import { motion } from "framer-motion";

interface ContinueListeningItem {
  trackId: string;
  progress: number;
  duration: number;
  timestamp: number;
}

const ContinueListening = () => {
  const [items, setItems] = useState<ContinueListeningItem[]>([]);
  const { playTrack } = usePlayer();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ranna_continue_listening");
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const trackIds = items.map(t => t.trackId);
  const { data: tracks, isLoading } = useMadhaatByIds(trackIds);

  if (!items.length || isLoading || !tracks?.length) return null;

  const formatTimeLeft = (item: ContinueListeningItem) => {
    if (!item.duration || !isFinite(item.duration)) return "";
    const timeLeftSeconds = item.duration - (item.progress / 100 * item.duration);
    const minutesLeft = Math.round(timeLeftSeconds / 60);
    return `باقي ${minutesLeft} د`;
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((nowDay.getTime() - dateDay.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 0) return "اليوم";
    if (diffDays === 1) return "أمس";
    return new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(date);
  };

  return (
    <section className="pt-6 pb-2">
      <div className="flex flex-col gap-2 px-5 mb-4 md:px-12">
        <h2 className="font-panorama text-xl font-bold">أكمل الاستماع</h2>
      </div>

      <div className="px-5 md:px-12 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item, i) => {
          const track = tracks.find(t => t.id === item.trackId);
          if (!track) return null;

          return (
            <motion.div
              key={item.trackId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => playTrack(track.id, trackIds)}
              className="relative overflow-hidden transition-colors rounded-lg flex flex-col justify-end p-3 h-20 cursor-pointer shadow-sm ring-1 ring-border/10 group bg-slate-900"
            >
              <div className="absolute inset-0 z-0">
                {track.image_url ? (
                  <img 
                    src={getImageUrl(track.image_url)} 
                    alt={track.title} 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src="/logo-ranna.png" 
                      alt="Ranna Logo" 
                      className="h-10 opacity-20 grayscale invert" 
                    />
                  </div>
                )}
                {/* Subtle logo watermark in corner if image exists */}
                {track.image_url && (
                  <img 
                    src="/logo-ranna.png" 
                    alt="" 
                    className="absolute top-2 left-2 h-3 opacity-20 grayscale invert pointer-events-none" 
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              </div>
              
              <div className="relative z-10 flex flex-col justify-end">
                <h3 className="font-fustat text-sm font-semibold truncate leading-tight mb-0.5 text-white">{track.title}</h3>
                <p className="text-[11px] text-white/80 truncate">
                  {formatTimestamp(item.timestamp)} • {formatTimeLeft(item)}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 rounded-b-lg overflow-hidden z-20">
                <div className="h-full bg-primary" style={{ width: `${item.progress}%`, transformOrigin: 'right' }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default ContinueListening;
