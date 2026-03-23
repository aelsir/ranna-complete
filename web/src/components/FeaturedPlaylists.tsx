import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollections } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";

const FeaturedPlaylists = () => {
  const navigate = useNavigate();
  const { data: playlists, isLoading } = useCollections();

  if (isLoading || !playlists?.length) return null;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between px-5 mb-5 md:px-12">
        <h2 className="font-panorama text-xl font-bold">قوائم مميزة</h2>
        <Badge
          variant="secondary"
          onClick={() => navigate("/playlists")}
          className="cursor-pointer rounded-full px-3 py-1 font-fustat text-xs font-bold gap-1 hover:shadow-sm transition-shadow"
        >
          عرض الكل
          <ChevronLeft className="h-3 w-3" />
        </Badge>
      </div>
      <div className="flex gap-3.5 overflow-x-auto px-5 pb-2 md:grid md:grid-cols-4 md:px-12 md:overflow-visible lg:grid-cols-6 snap-x snap-proximity">
        {playlists.map((pl, i) => (
          <motion.div
            key={pl.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="snap-start flex-shrink-0 w-[140px] md:w-auto"
          >
            <div
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-card ring-1 ring-border/20">
                <img
                  src={getImageUrl(pl.image_url)}
                  alt={pl.name}
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-2.5 start-2.5 h-9 w-9 rounded-full opacity-0 shadow-glow-secondary transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2"
                >
                  <RtlPlay className="h-3.5 w-3.5" fill="currentColor" />
                </Button>
              </div>
              <h3 className="mt-2.5 font-fustat text-xs font-bold leading-tight truncate">
                {pl.name}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{pl.description || ""}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedPlaylists;
