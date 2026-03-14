import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMadiheenWithMadhaat } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";

const PopularArtists = () => {
  const navigate = useNavigate();
  const { data: artists, isLoading } = useMadiheenWithMadhaat(10);

  if (isLoading) return null;
  if (!artists || artists.length === 0) return null;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between px-5 mb-5 md:px-12">
        <h2 className="font-fustat text-xl font-bold">المادحون</h2>
        <Badge
          variant="secondary"
          onClick={() => navigate("/artists")}
          className="cursor-pointer rounded-full px-3 py-1 font-fustat text-xs font-bold gap-1 hover:shadow-sm transition-shadow"
        >
          عرض الكل
          <ChevronLeft className="h-3 w-3" />
        </Badge>
      </div>
      <div className="flex gap-5 overflow-x-auto px-5 pb-2 md:grid md:grid-cols-6 md:px-12 md:overflow-visible snap-x snap-mandatory overscroll-x-contain touch-pan-x">
        {artists.map((artist, i) => (
          <motion.div
            key={artist.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="snap-start flex-shrink-0"
          >
            <div
              onClick={() => navigate(`/profile/artist/${artist.id}`)}
              className="group cursor-pointer text-center active:scale-95 transition-transform duration-150"
            >
              <div className="relative mx-auto mb-2.5">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-secondary/40 via-accent/20 to-secondary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                <Avatar className="relative h-[76px] w-[76px] md:h-[90px] md:w-[90px] ring-2 ring-transparent group-hover:ring-secondary/40 transition-all duration-300">
                  <AvatarImage src={getImageUrl(artist.image_url)} alt={artist.name} className="object-cover" />
                  <AvatarFallback className="font-fustat text-lg">{artist.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <h3 className="font-fustat text-[11px] font-bold leading-tight max-w-[80px] mx-auto">{artist.name}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default PopularArtists;
