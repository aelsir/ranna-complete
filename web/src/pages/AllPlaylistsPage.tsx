import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";

const ITEMS_PER_PAGE = 20;

const AllPlaylistsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data: playlists, isLoading } = useCollections();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <p className="font-naskh text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <p className="font-naskh text-muted-foreground">لا توجد قوائم تشغيل</p>
      </div>
    );
  }

  const totalPages = Math.ceil(playlists.length / ITEMS_PER_PAGE);
  const paginatedItems = playlists.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
        <h1 className="font-fustat text-lg font-bold">القوائم المميزة</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 pt-4 md:grid-cols-3 lg:grid-cols-4 md:px-12">
        {paginatedItems.map((pl, i) => (
          <motion.div
            key={pl.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <div
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="group cursor-pointer active:scale-95 transition-transform duration-150"
            >
              <div className="relative overflow-hidden rounded-xl">
                <img src={getImageUrl(pl.image_url)} alt={pl.name} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent" />
              </div>
              <h3 className="mt-2 font-fustat text-xs font-bold leading-tight truncate">{pl.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{pl.description || ""}</p>
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

export default AllPlaylistsPage;
