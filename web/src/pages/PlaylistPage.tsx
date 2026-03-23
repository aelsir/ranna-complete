import { useParams, useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { ArrowRight, Shuffle } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCollection, useCollectionItems } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";
import TrackRow from "@/components/TrackRow";
import { ShareButton } from "@/components/ShareButton";
import { getPlaylistShareUrl } from "@/lib/share";

const PlaylistPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playTrack, toggleShuffle, shuffleOn } = usePlayer();

  const { data: playlist, isLoading: loadingPlaylist } = useCollection(id);
  const { data: playlistTracks, isLoading: loadingTracks } = useCollectionItems(id);

  if (loadingPlaylist || loadingTracks) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-naskh text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-naskh text-muted-foreground">لم يتم العثور على القائمة</p>
      </div>
    );
  }

  const queue = (playlistTracks || []).map(t => t.id);

  const handlePlayAll = () => {
    if (queue.length > 0) {
      playTrack(queue[0], queue);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className=""
    >
      {/* Header */}
      <div className="relative">
        <div className="h-72 w-full overflow-hidden md:h-80">
          <img src={getImageUrl(playlist.image_url)} alt={playlist.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-10 right-4 z-10 h-9 w-9 rounded-full glass text-foreground hover:bg-background/60"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-0 right-0 left-0 px-5 pb-5">
          <p className="font-fustat text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">قائمة تشغيل</p>
          <h1 className="font-fustat text-2xl font-extrabold text-foreground md:text-3xl">{playlist.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{playlist.description || ""} · {playlistTracks?.length || 0} مقطع</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-5 py-4">
        <Button onClick={handlePlayAll} className="h-11 rounded-full gap-2 px-6 font-fustat font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-glow-secondary">
          <RtlPlay className="h-4 w-4" fill="currentColor" />
          تشغيل
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={shuffleOn ? "text-accent" : "text-muted-foreground hover:text-foreground"}
          onClick={() => {
            if (!shuffleOn) toggleShuffle();
            if (queue.length > 0) {
              const randomIndex = Math.floor(Math.random() * queue.length);
              playTrack(queue[randomIndex], queue);
            }
          }}
        >
          <Shuffle className="h-5 w-5" strokeWidth={1.5} />
        </Button>
        <ShareButton
          url={getPlaylistShareUrl(id!)}
          title={`${playlist?.name} | رنّة`}
        />
      </div>

      {/* Track list */}
      <div className="px-5 md:px-12">
        {(playlistTracks || []).map((track, i) => (
          <div key={track.id}>
            <TrackRow track={track} index={i} animate={false} contextQueue={queue} />
            {i < (playlistTracks?.length || 0) - 1 && <div className="h-px bg-border/30 mx-3" />}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default PlaylistPage;
