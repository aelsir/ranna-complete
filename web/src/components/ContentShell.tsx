import { useLocation } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";

const ContentShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { nowPlayingId } = usePlayer();

  // Skip shell for dashboard — it has its own full-screen layout
  if (location.pathname.startsWith("/dashboard")) {
    return <>{children}</>;
  }

  return (
    <main
      className={`fixed top-2 left-3 right-3 rounded-3xl bg-card overflow-y-auto overflow-x-hidden border border-border/30 shadow-card z-10 transition-[bottom] duration-300 ease-in-out ${
        nowPlayingId
          ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(5rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {children}
    </main>
  );
};

export default ContentShell;
