import { Home, Search, Heart, UserCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { label: "السَّاحة", icon: Home, path: "/" },
  { label: "فتّش", icon: Search, path: "/search" },
  { label: "مُختاراتي", icon: Heart, path: "/favorites" },
  // { label: "زاويتي", icon: UserCircle, path: "/account" },
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
              <tab.icon className="relative z-10 h-5 w-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="relative z-10 font-fustat text-[10px] font-bold">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomTabs;
