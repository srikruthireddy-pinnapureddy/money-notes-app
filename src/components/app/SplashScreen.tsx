import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import logoAnimated from "@/assets/logo-animated.mp4";
import logoStatic from "@/assets/logo.png";

interface SplashScreenProps {
  durationMs?: number;
  onFinish: () => void;
}

export function SplashScreen({ durationMs = 2500, onFinish }: SplashScreenProps) {
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onFinish]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-label="Loading ExpenX"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950"
    >
      {/* Glow effect behind logo */}
      <motion.div
        className="absolute w-48 h-48 rounded-full bg-primary/20 blur-3xl"
        animate={{
          opacity: [0.4, 0.8, 0.4],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Logo container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10"
      >
        {/* Video Logo */}
        <motion.div
          animate={showPulse ? {
            boxShadow: [
              "0 0 0 0 rgba(124, 58, 237, 0)",
              "0 0 40px 15px rgba(124, 58, 237, 0.3)",
              "0 0 0 0 rgba(124, 58, 237, 0)",
            ],
          } : {}}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="rounded-3xl overflow-hidden"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={logoStatic}
            className="h-24 w-24 object-cover rounded-3xl"
          >
            <source src={logoAnimated} type="video/mp4" />
            <img 
              src={logoStatic} 
              alt="ExpenX" 
              className="h-24 w-24 object-cover rounded-3xl"
            />
          </video>
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mt-6 text-2xl font-bold text-center text-foreground"
        >
          ExpenX
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="mt-1 text-sm text-muted-foreground text-center"
        >
          Smart expense splitting
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default SplashScreen;
