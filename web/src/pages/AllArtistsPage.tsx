import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMadiheen } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";

const ITEMS_PER_PAGE = 20;

const AllArtistsPage = () => {
  const navigate = useNavigate();
  const { data: artists, isLoading } = useMadiheen();
  const [page, setPage] = useState(1);

  if (isLoading) return <div className="flex h-full items-center justify-center py-20"><p className="font-naskh text-muted-foreground">جاري التحميل...</p></div>;
  if (!artists) return null;

  const totalPages = Math.ceil(artists.length / ITEMS_PER_PAGE);
  const paginatedItems = artists.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className=""
    >
      <div className="sticky top-0 z-20 bg-card px-5 py-4 flex items-center gap-3 border-b border-border/30 rounded-t-3xl">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 rounded-full text-foreground">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="font-fustat text-lg font-bold">المادحون</h1>
      </div>

      <div className="grid grid-cols-3 gap-5 px-5 pt-4 md:grid-cols-4 lg:grid-cols-6 md:px-12">
        {paginatedItems.map((artist, i) => (
          <motion.div
            key={artist.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <div
              onClick={() => navigate(`/profile/artist/${artist.id}`)}
              className="group cursor-pointer text-center active:scale-95 transition-transform duration-150"
            >
              <div className="relative mx-auto mb-2.5">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-secondary/40 via-accent/20 to-secondary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                <Avatar className="relative h-20 w-20 md:h-24 md:w-24 ring-2 ring-transparent group-hover:ring-secondary/40 transition-all duration-300">
                  <AvatarImage src={getImageUrl(artist.image_url)} alt={artist.name} className="object-cover" />
                  <AvatarFallback className="font-fustat text-lg">{artist.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <h3 className="font-fustat text-xs font-bold leading-tight max-w-[90px] mx-auto">{artist.name}</h3>
              <p className="font-fustat text-[10px] text-muted-foreground mt-0.5">{"مادح"}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-5 pt-6">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-fustat text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default AllArtistsPage;
