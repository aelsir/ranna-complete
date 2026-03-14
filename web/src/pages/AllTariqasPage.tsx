import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTuruq } from "@/lib/api/hooks";

const ITEMS_PER_PAGE = 20;

const AllTariqasPage = () => {
  const navigate = useNavigate();
  const { data: tariqas, isLoading } = useTuruq();
  const [page, setPage] = useState(1);

  if (isLoading) return <div className="flex h-full items-center justify-center py-20"><p className="font-naskh text-muted-foreground">جاري التحميل...</p></div>;
  if (!tariqas) return null;

  const totalPages = Math.ceil(tariqas.length / ITEMS_PER_PAGE);
  const paginatedItems = tariqas.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
        <h1 className="font-fustat text-lg font-bold">الطرق الصوفية</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 pt-4 md:grid-cols-3 lg:grid-cols-4 md:px-12">
        {paginatedItems.map((tq, i) => (
          <motion.div
            key={tq.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <div className="group cursor-pointer active:scale-95 transition-transform duration-150">
              <div className="relative overflow-hidden rounded-xl">
                <div className="aspect-square w-full bg-gradient-to-br from-primary/20 to-accent/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 start-3 end-3">
                  <h3 className="font-fustat text-sm font-bold text-white">{tq.name}</h3>
                </div>
              </div>
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

export default AllTariqasPage;
