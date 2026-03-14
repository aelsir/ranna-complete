import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Headphones, Clock, Music, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePopularMadhaat, useMadiheen, useAnalyticsSummary } from "@/lib/api/hooks";
import { formatDuration, toArabicNum, getImageUrl } from "@/lib/format";
import Navbar from "@/components/Navbar";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const ListeningStatsPage = () => {
  const navigate = useNavigate();
  const { data: allTracks } = usePopularMadhaat(5);
  const { data: allArtists } = useMadiheen();
  const { data: summary } = useAnalyticsSummary();

  const topTracks = (allTracks || []).map((t) => ({
    ...t,
    playCount: t.play_count,
  }));

  const topArtists = (allArtists || []).slice(0, 4);

  const totalPlays = summary?.totalPlays || 0;
  const totalMinutes = Math.round((summary?.totalDuration || 0) / 60);
  const totalTracks = summary?.madhaCount || 0;

  const statCards = [
    { icon: Headphones, label: "مرات التشغيل", value: toArabicNum(totalPlays), color: "text-primary" },
    { icon: Clock, label: "دقائق الاستماع", value: toArabicNum(totalMinutes), color: "text-accent" },
    { icon: Music, label: "المدائح", value: toArabicNum(totalTracks), color: "text-primary" },
  ];

  return (
    <div>
      <Navbar />
      <div className="px-4 pb-5 md:px-12 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/account")}
            className="rounded-full h-9 w-9"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="font-fustat text-2xl font-extrabold text-foreground">إحصائيات الاستماع</h1>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {statCards.map((stat) => (
            <motion.div
              key={stat.label}
              variants={item}
              className="rounded-2xl bg-card border border-border/60 p-4 text-center shadow-sm"
            >
              <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
              <p className="font-fustat text-xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground font-noto-naskh mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Top Tracks */}
        <motion.div variants={item} initial="hidden" animate="show" className="mb-8">
          <h2 className="font-fustat text-sm font-bold text-muted-foreground mb-3 px-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الأكثر استماعاً
          </h2>
          <div className="rounded-2xl bg-card border border-border/60 overflow-hidden shadow-sm">
            {topTracks.map((track, idx) => (
              <div key={track.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="font-fustat text-lg font-extrabold text-muted-foreground/50 w-6 text-center shrink-0">
                    {(idx + 1).toLocaleString("ar-SA")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-fustat text-sm font-bold text-foreground truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground font-noto-naskh">{track.madiheen?.name || track.madih}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <Headphones className="h-3.5 w-3.5" />
                    <span className="text-xs font-fustat font-bold">{track.playCount.toLocaleString("ar-SA")}</span>
                  </div>
                </div>
                {idx < topTracks.length - 1 && (
                  <div className="h-px bg-border/40 mr-14" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Artists */}
        <motion.div variants={item} initial="hidden" animate="show">
          <h2 className="font-fustat text-sm font-bold text-muted-foreground mb-3 px-1 flex items-center gap-2">
            <Music className="h-4 w-4" />
            أكثر المدّاحين استماعاً
          </h2>
          <div className="rounded-2xl bg-card border border-border/60 overflow-hidden shadow-sm">
            {topArtists.map((artist, idx) => (
              <div key={artist.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={getImageUrl(artist.image_url)}
                    alt={artist.name}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-fustat text-sm font-bold text-foreground">{artist.name}</p>
                    <p className="text-xs text-muted-foreground font-noto-naskh">{"مادح"}</p>
                  </div>
                </div>
                {idx < topArtists.length - 1 && (
                  <div className="h-px bg-border/40 mr-14" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ListeningStatsPage;
