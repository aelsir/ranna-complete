import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { usePlayer } from "@/context/PlayerContext";
import { useMadhaatByIds } from "@/lib/api/hooks";
import TrackRow from "@/components/TrackRow";

const FavoritesPage = () => {
  const { favorites } = usePlayer();
  const favoriteIds = Array.from(favorites);
  const { data: favTracks = [] } = useMadhaatByIds(favoriteIds);
  const queue = favTracks.map(t => t.id);

  return (
    <div className="px-5 pt-5 pb-5 md:px-12">
      <h2 className="mb-6 font-fustat text-2xl font-bold">المختارات</h2>
      {favTracks.length === 0 ? (
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
            </motion.div>
            <p className="font-fustat text-muted-foreground text-center">
              لم تقم بإضافة أي مدحة للمختارات بعد
            </p>
            <p className="font-fustat text-sm text-muted-foreground/60 mt-1">
              اضغط على ❤️ لإضافة مدحة هنا
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl shadow-card border-border/20 overflow-hidden">
          <CardContent className="p-2">
            {favTracks.map((track, i) => (
              <div key={track.id}>
                <TrackRow track={track} index={i} contextQueue={queue} />
                {i < favTracks.length - 1 && <div className="h-px bg-border/30 mx-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FavoritesPage;
