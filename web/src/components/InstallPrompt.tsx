import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

// Extend the window event type to include the non-standard beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the user has already dismissed the prompt
    if (localStorage.getItem("ranna_pwa_prompt_dismissed") === "true") {
      setIsDismissed(true);
    }

    // Check if app is already running in standalone mode (installed)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setIsInstalled(true);
      console.log('PWA was installed');
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("ranna_pwa_prompt_dismissed", "true");
  };

  // Only show the prompt if we have a deferred event, it's not dismissed, and not already installed
  const showPrompt = deferredPrompt !== null && !isDismissed && !isInstalled;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-[400px]"
        >
          <div className="glass-dark rounded-3xl p-4 shadow-float border border-primary-foreground/10 overflow-hidden relative">
            {/* Background glow */}
            <div className="absolute top-0 right-0 -m-8 w-24 h-24 bg-accent/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm">
                <img src="/pwa-192x192.png" alt="Ranna Logo" className="w-full h-full object-contain" />
              </div>
              
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-fustat font-bold text-sm text-foreground mb-1">تثبيت تطبيق رنّة</h3>
                <p className="text-xs text-muted-foreground font-noto-naskh leading-relaxed">
                  أضف التطبيق إلى شاشتك الرئيسية للوصول السريع للمدائح وتجربة استماع أفضل
                </p>
                
                <div className="flex items-center gap-2 mt-3">
                  <Button 
                    onClick={handleInstallClick}
                    size="sm" 
                    className="h-8 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow-accent px-4 py-0 text-xs font-fustat font-bold gap-1.5"
                  >
                    <Download className="h-3 w-3" />
                    تثبيت
                  </Button>
                  <Button 
                    onClick={handleDismiss}
                    variant="ghost" 
                    size="sm" 
                    className="h-8 rounded-full text-xs text-muted-foreground hover:text-foreground px-3 py-0"
                  >
                    لاحقاً
                  </Button>
                </div>
              </div>

              <button 
                onClick={handleDismiss}
                className="absolute top-0 left-0 p-1 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
