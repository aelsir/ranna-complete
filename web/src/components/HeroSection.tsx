import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DownloadAppCTA from "@/components/DownloadAppCTA";
import { useActiveHeroImages, useHomePageData } from "@/lib/api/hooks";
import { useCountUp } from "@/lib/useCountUp";
import { getImageUrl } from "@/lib/format";
import heroBgFallback from "@/assets/hero-bg.jpg";

/** Time each hero is on screen before crossfading. */
const SLIDE_INTERVAL_MS = 7000;

interface Slide {
  id: string;
  src: string;
  linkUrl: string | null;
}

const HeroSection = () => {
  const { data: homeData } = useHomePageData();
  const { data: heroes } = useActiveHeroImages();
  const navigate = useNavigate();
  const count = homeData?.totalTracks;
  const animatedCount = useCountUp(count);

  // Build the slide list. If admin hasn't set anything (or fetch failed),
  // fall back to the bundled asset so we never render an empty banner.
  const slides: Slide[] =
    heroes && heroes.length > 0
      ? heroes.map((h) => ({
          id: h.id,
          src: getImageUrl(h.image_url),
          linkUrl: h.link_url,
        }))
      : [{ id: "fallback", src: heroBgFallback, linkUrl: null }];

  // Index of the currently visible slide.
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index if the slide set shrinks (e.g. admin disabled some).
  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0);
  }, [slides.length, currentIndex]);

  // Auto-advance. Only if more than one slide.
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const activeSlide = slides[currentIndex] ?? slides[0];

  const handleHeroClick = () => {
    if (activeSlide?.linkUrl) navigate(activeSlide.linkUrl);
  };

  return (
    <section className="relative h-[56vh] min-h-[360px] overflow-hidden">
      {/* Background layer(s) — each slide is its own <img> so we can
          catch onError and fall back to the bundled asset if the R2
          URL fails (the equivalent of Image.network's errorBuilder
          on the Flutter side). The first slide also gets a subtle
          1.1 → 1 scale-in so the page entry still feels alive. */}
      {slides.map((slide, idx) => {
        const isActive = idx === currentIndex;
        const isFirstSlide = idx === 0;
        return (
          <motion.div
            key={slide.id}
            initial={isFirstSlide ? { scale: 1.1 } : false}
            animate={isFirstSlide ? { scale: 1 } : undefined}
            transition={
              isFirstSlide
                ? { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
                : undefined
            }
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!isActive}
          >
            <img
              src={slide.src}
              alt=""
              loading={isFirstSlide ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-cover select-none"
              onError={(e) => {
                // R2 URL failed (deleted, network blip, CORS, etc.) —
                // swap to the bundled asset so the banner never shows
                // a broken-image icon or a bare gradient. Detach the
                // handler so a failing fallback can't loop.
                const img = e.currentTarget;
                img.onerror = null;
                img.src = heroBgFallback;
              }}
            />
          </motion.div>
        );
      })}

      {/* Rich gradient overlay (unchanged) */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-primary/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 pointer-events-none" />

      {/* Clickable hero-link layer — only present when the active slide
          has a link_url. Sits below the foreground content so the
          download CTA stays clickable. */}
      {activeSlide?.linkUrl && (
        <button
          type="button"
          onClick={handleHeroClick}
          aria-label="افتح المحتوى المميّز"
          className="absolute inset-0 z-[5] cursor-pointer focus:outline-none"
        />
      )}

      <div className="relative z-10 flex h-full flex-col items-start justify-end px-6 pb-10 md:px-12 pointer-events-none">
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
            {animatedCount != null ? (
              <>
                استمع الآن لأكثر من{" "}
                <span className="tabular-nums">{animatedCount}</span> مدحة
              </>
            ) : (
              "استمع الآن"
            )}
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
          transition={{
            duration: 0.5,
            delay: 0.35,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="pointer-events-auto"
        >
          <DownloadAppCTA />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
