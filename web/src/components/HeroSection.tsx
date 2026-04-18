import { useCallback } from "react";
import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMadhaat, useHomePageData } from "@/lib/api/hooks";
import { usePlayer } from "@/context/PlayerContext";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const { data: madhaat } = useMadhaat();
  const { data: homeData } = useHomePageData();
  const count = homeData?.totalTracks;
  const { playTrack } = usePlayer();

  const handlePickForYou = useCallback(() => {
    if (!madhaat || madhaat.length === 0) return;
    const randomIndex = Math.floor(Math.random() * madhaat.length);
    const picked = madhaat[randomIndex];
    const allIds = madhaat.map((m) => m.id);
    playTrack(picked.id, allIds);
  }, [madhaat, playTrack]);

  return (
    <section className="relative h-[56vh] min-h-[360px] overflow-hidden">
      {/* Parallax-like bg */}
      <motion.div
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Rich gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-primary/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10" />

      <div className="relative z-10 flex h-full flex-col items-start justify-end px-6 pb-10 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur-sm px-3 py-1"
        >
          <div className="relative flex h-2 w-2 items-center justify-center">
            <motion.span
              animate={{
                scale: [1, 2.5, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute h-full w-full rounded-full bg-secondary"
            />
            <span className="relative h-1.5 w-1.5 rounded-full bg-secondary" />
          </div>
          <span className="font-fustat text-[10px] font-bold text-primary-foreground/80">
            {count && count > 0
              ? `استمع الآن لأكثر من ${count} مدحة`
              : "استمع الآن"}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-2 font-fustat text-4xl font-extrabold text-primary-foreground md:text-5xl leading-[1.1]"
        >
          المدائح النبوية
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 max-w-sm text-sm text-primary-foreground/65 leading-relaxed"
        >
          أجمل المدائح النبوية والأذكار من أشهر المادحين السودانيين
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full gap-2.5 font-fustat font-bold shadow-glow-secondary hover:shadow-glow-secondary hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 px-7"
            onClick={handlePickForYou}
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.5} />
            إخترنا لك
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
