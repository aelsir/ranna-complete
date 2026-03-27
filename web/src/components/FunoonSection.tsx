import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFunun } from "@/lib/api/hooks";

const FunoonSection = () => {
  const navigate = useNavigate();
  const { data: funoon, isLoading } = useFunun();

  if (isLoading || !funoon?.length) return null;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between px-5 mb-5 md:px-12">
        <h2 className="font-fustat text-xl font-bold">الفن</h2>
        <Badge
          variant="secondary"
          onClick={() => navigate("/funoon")}
          className="cursor-pointer rounded-full px-3 py-1 font-fustat text-xs font-bold gap-1 hover:shadow-sm transition-shadow"
        >
          عرض الكل
          <ChevronLeft className="h-3 w-3" />
        </Badge>
      </div>
      <div className="flex gap-3.5 overflow-x-auto px-5 pb-2 md:grid md:grid-cols-4 md:px-12 md:overflow-visible snap-x snap-mandatory overscroll-x-contain touch-pan-x">
        {funoon.map((fn, i) => (
          <motion.div
            key={fn.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="snap-start flex-shrink-0 w-[140px] md:w-auto"
          >
            <div className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-2xl shadow-card ring-1 ring-border/20">
                <div className="aspect-square w-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                  <span className="font-fustat text-2xl font-bold text-accent/60">{fn.name[0]}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 start-2.5 end-2.5">
                  <h3 className="font-fustat text-[11px] font-bold text-white leading-tight truncate">{fn.name}</h3>
                </div>
              </div>
              
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FunoonSection;
