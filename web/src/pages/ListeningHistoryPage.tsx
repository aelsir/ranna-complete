import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/context/PlayerContext";
import { useMadhaat } from "@/lib/api/hooks";
import { formatDuration } from "@/lib/format";
import Navbar from "@/components/Navbar";

const formatRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return date.toLocaleDateString("ar-SA");
};

const ListeningHistoryPage = () => {
  const navigate = useNavigate();
  const { nowPlayingId, playTrack } = usePlayer();
  const { data: allTracks, isLoading } = useMadhaat({ limit: 8 });

  const listeningHistory = allTracks || [];

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center pt-20">
          <p className="font-naskh text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="px-4 pb-5 md:px-12 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/account")}
            className="rounded-full h-9 w-9"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="font-fustat text-2xl font-extrabold text-foreground">سجل الاستماع</h1>
        </motion.div>

        {listeningHistory.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-fustat text-muted-foreground">لا يوجد سجل استماع بعد</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-1"
          >
            {listeningHistory.map((entry) => {
              const isCurrentTrack = nowPlayingId === entry.id;
              return (
                <motion.div
                  key={entry.id + entry.created_at}
                  variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-muted/50 ${
                    isCurrentTrack ? "bg-primary/5" : ""
                  }`}
                >
                  <button
                    onClick={() => playTrack(entry.id, listeningHistory.map(t => t.id))}
                    className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
                  >
                    {isCurrentTrack ? (
                      <Pause className="h-4 w-4 text-primary" />
                    ) : (
                      <Play className="h-4 w-4 text-primary mr-[-2px]" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-fustat text-sm font-bold text-foreground truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground font-noto-naskh truncate">
                      {entry.madiheen?.name || entry.madih} · {formatDuration(entry.duration_seconds)}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-noto-naskh shrink-0">
                    {formatRelativeTime(entry.created_at)}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ListeningHistoryPage;
