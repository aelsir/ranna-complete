import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Shuffle } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMadih, useRawi, useMadhaatByMadih, useMadhaatByRawi } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";
import TrackRow from "@/components/TrackRow";
import { ShareButton } from "@/components/ShareButton";
import { getProfileShareUrl } from "@/lib/share";

import { usePlayer } from "@/context/PlayerContext";

const ProfilePage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  const isArtist = type === "artist";
  const { data: madih, isLoading: loadingMadih } = useMadih(isArtist ? id : undefined);
  const { data: rawi, isLoading: loadingRawi } = useRawi(!isArtist ? id : undefined);
  const { data: madihTracks } = useMadhaatByMadih(isArtist ? id : undefined);
  const { data: rawiTracks } = useMadhaatByRawi(!isArtist ? id : undefined);

  const profile = isArtist ? madih : rawi;
  const profileTracks = (isArtist ? madihTracks : rawiTracks) || [];
  const isLoading = isArtist ? loadingMadih : loadingRawi;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-naskh text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-naskh text-muted-foreground">لم يتم العثور على الصفحة</p>
      </div>
    );
  }

  const queue = profileTracks.map(t => t.id);

  const handlePlayAll = () => {
    if (queue.length > 0) {
      playTrack(queue[0], queue);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="relative">
        <div className="h-64 w-full overflow-hidden md:h-80">
          <img src={getImageUrl(profile?.image_url)} alt={profile?.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-10 right-4 z-10 h-8 w-8 rounded-full bg-background/40 backdrop-blur-sm text-foreground hover:bg-background/60"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-0 right-0 left-0 px-5 pb-4">
          <p className="font-fustat text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{isArtist ? "مادح" : "راوي"}</p>
          <h1 className="font-fustat text-2xl font-extrabold text-foreground md:text-3xl">{profile?.name}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{profileTracks.length} مدحة</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-5 py-3">
        <Button onClick={handlePlayAll} variant="secondary" size="icon" className="h-11 w-11 rounded-full hover:scale-105 active:scale-95 transition-transform">
          <RtlPlay className="h-5 w-5" fill="currentColor" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Shuffle className="h-5 w-5" strokeWidth={1.5} />
        </Button>
        <ShareButton
          url={getProfileShareUrl(isArtist ? "artist" : "narrator", id!)}
          title={`${profile?.name} | رنّة`}
        />
      </div>

      {/* Track list */}
      <div className="px-5 md:px-12">
        {profileTracks.map((track, i) => (
          <div key={track.id}>
            <TrackRow track={track} index={i} animate={false} />
            {i < profileTracks.length - 1 && <div className="h-px bg-border/30 mx-3" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;
