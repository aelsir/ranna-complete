import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRuwatWithMadhaat } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";

const Narrators = () => {
  const navigate = useNavigate();
  const { data: narrators, isLoading } = useRuwatWithMadhaat(10);

  if (isLoading) return null;
  if (!narrators || narrators.length === 0) return null;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between px-5 mb-5 md:px-12">
        <h2 className="font-panorama text-xl font-bold">الراوون</h2>
        <Badge
          variant="secondary"
          onClick={() => navigate("/narrators")}
          className="cursor-pointer rounded-full px-3 py-1 font-fustat text-xs font-bold gap-1 hover:shadow-sm transition-shadow"
        >
          عرض الكل
          <ChevronLeft className="h-3 w-3" />
        </Badge>
      </div>
      <div className="flex gap-5 overflow-x-auto px-5 pb-2 md:grid md:grid-cols-6 md:px-12 md:overflow-visible snap-x snap-mandatory overscroll-x-contain touch-pan-x">
        {narrators.map((narrator, i) => (
          <motion.div
            key={narrator.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="snap-start flex-shrink-0"
          >
            <div
              onClick={() => navigate(`/profile/narrator/${narrator.id}`)}
              className="group cursor-pointer text-center active:scale-95 transition-transform duration-150"
            >
              <div className="relative mx-auto mb-2.5">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-accent/30 via-primary/15 to-accent/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                <Avatar className="relative h-[76px] w-[76px] rounded-xl md:h-[90px] md:w-[90px] ring-2 ring-transparent group-hover:ring-accent/30 transition-all duration-300">
                  <AvatarImage src={getImageUrl(narrator.image_url)} alt={narrator.name} className="object-cover rounded-xl" />
                  <AvatarFallback className="font-fustat text-lg rounded-xl">{narrator.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <h3 className="font-fustat text-[11px] font-bold leading-tight max-w-[80px] mx-auto">{narrator.name}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Narrators;
