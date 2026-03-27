import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { RannaIcon, type RannaIconName } from "@/components/icons/RannaIcon";

const tabs: { label: string; icon: RannaIconName; path: string }[] = [
  { label: "السَّاحة", icon: "home", path: "/" },
  { label: "فتّش", icon: "search", path: "/search" },
  { label: "مُختاراتي", icon: "love", path: "/favorites" },
  // { label: "زاويتي", icon: "profile", path: "/account" },
];

const BottomTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on dashboard
  if (location.pathname.startsWith("/dashboard")) return null;

  return (
    <div className="fixed bottom-2 left-3 right-3 z-40 glass-heavy rounded-2xl pb-[env(safe-area-inset-bottom)] shadow-float border border-border/20">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
          return (
            <motion.button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`relative flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-2xl transition-colors duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-2xl bg-muted/70"
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                />
              )}
              <span className="relative z-10">
                <RannaIcon name={tab.icon} size={20} />
              </span>
              <span className="relative z-10 font-fustat text-[10px] font-bold">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomTabs;
