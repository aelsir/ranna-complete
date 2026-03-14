import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturedPlaylists from "@/components/FeaturedPlaylists";
import PopularArtists from "@/components/PopularArtists";
import Narrators from "@/components/Narrators";
import TrendingTracks from "@/components/TrendingTracks";
import RecentlyAdded from "@/components/RecentlyAdded";
import ContinueListening from "@/components/ContinueListening";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="overflow-x-hidden"
    >
      <Navbar />
      <HeroSection />
      <div className="relative">
        <ContinueListening />
        <TrendingTracks />
        <FeaturedPlaylists />
        <PopularArtists />
        <Narrators />
        <RecentlyAdded />
      </div>
    </motion.div>
  );
};

export default Index;
