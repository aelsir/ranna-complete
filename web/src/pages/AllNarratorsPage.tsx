import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRuwat } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";

const ITEMS_PER_PAGE = 20;

const AllNarratorsPage = () => {
  const navigate = useNavigate();
  const { data: narrators, isLoading } = useRuwat();
  const [page, setPage] = useState(1);

  if (isLoading) return <div className="flex h-full items-center justify-center py-20"><p className="font-naskh text-muted-foreground">جاري التحميل...</p></div>;
  if (!narrators) return null;

  const totalPages = Math.ceil(narrators.length / ITEMS_PER_PAGE);
  const paginatedItems = narrators.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const pageTitle = `الرواة السودانيون للمديح — ${narrators.length} راوي | رنّة`;
  const pageDesc = `تصفح جميع الرواة السودانيين على رنّة — أكبر مكتبة للمدائح النبوية السودانية. ${narrators.slice(0, 8).map(n => n.name).join("، ")} وغيرهم.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "الرواة السودانيون للمديح النبوي",
    description: pageDesc,
    url: "https://ranna.aelsir.sd/narrators",
    inLanguage: "ar",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: narrators.length,
      itemListElement: narrators.slice(0, 50).map((n, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Person",
          name: n.name,
          url: `https://ranna.aelsir.sd/profile/narrator/${n.id}`,
          ...(n.image_url && { image: n.image_url }),
        },
      })),
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className=""
    >
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href="https://ranna.aelsir.sd/narrators" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ranna.aelsir.sd/narrators" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="sticky top-0 z-20 bg-card px-5 py-4 flex items-center gap-3 border-b border-border/30 rounded-t-3xl">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 rounded-full text-foreground">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="font-fustat text-lg font-bold">الراوون</h1>
        <span className="text-xs text-muted-foreground font-fustat">{narrators.length} راوي</span>
      </div>

      <div className="grid grid-cols-3 gap-5 px-5 pt-4 md:grid-cols-4 lg:grid-cols-6 md:px-12">
        {paginatedItems.map((narrator, i) => (
          <motion.div
            key={narrator.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <div
              onClick={() => navigate(`/profile/narrator/${narrator.id}`)}
              className="group cursor-pointer text-center active:scale-95 transition-transform duration-150"
            >
              <div className="relative mx-auto mb-2.5">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-accent/30 via-primary/15 to-accent/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                <Avatar className="relative h-20 w-20 rounded-xl md:h-24 md:w-24 ring-2 ring-transparent group-hover:ring-accent/30 transition-all duration-300">
                  <AvatarImage src={getImageUrl(narrator.image_url)} alt={narrator.name} className="object-cover rounded-xl" />
                  <AvatarFallback className="font-fustat text-lg rounded-xl">{narrator.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <h3 className="font-fustat text-xs font-bold leading-tight max-w-[90px] mx-auto">{narrator.name}</h3>
              <p className="font-fustat text-[10px] text-muted-foreground mt-0.5">{"راوي"}</p>
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

export default AllNarratorsPage;
