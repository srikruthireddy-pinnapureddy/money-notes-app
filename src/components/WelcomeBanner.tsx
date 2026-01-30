import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeBannerProps {
  userName?: string;
  onDismiss?: () => void;
}

const STORAGE_KEY = "expenx_welcome_dismissed";

export function WelcomeBanner({ userName, onDismiss }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Small delay for smoother appearance after page load
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
    onDismiss?.();
  };

  const displayName = userName?.split("@")[0] || "there";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-4 sm:p-5 text-primary-foreground shadow-lg"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Welcome to ExpenX
                </span>
              </div>
              
              <h2 className="text-lg sm:text-xl font-bold mb-1">
                Hey {displayName}! 👋
              </h2>
              
              <p className="text-sm opacity-90 mb-3 max-w-md">
                Track expenses, split bills with friends, and manage your finances—all in one place.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-primary-foreground border-0 backdrop-blur-sm"
                  onClick={handleDismiss}
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss welcome message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WelcomeBanner;
