import { useEffect } from "react";
import { motion } from "framer-motion";
import logoAnimated from "@/assets/logo-animated.mp4";
import logoStatic from "@/assets/logo.png";

interface SplashScreenProps {
  durationMs?: number;
  onFinish: () => void;
}

export function SplashScreen({ durationMs = 2500, onFinish }: SplashScreenProps) {
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
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      role="region"
      aria-label="Loading ExpenX"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950"
    >
      {/* Animated glow rings */}
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-primary/10 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-48 h-48 rounded-full bg-primary/20 blur-2xl"
        animate={{
          scale: [1.2, 0.9, 1.2],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
      />

      {/* Logo and text container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.22, 1, 0.36, 1],
          delay: 0.1 
        }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Logo with pulse effect */}
        <motion.div
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(124, 58, 237, 0)",
              "0 0 60px 20px rgba(124, 58, 237, 0.25)",
              "0 0 0 0 rgba(124, 58, 237, 0)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="rounded-3xl overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.22, 1, 0.36, 1],
              delay: 0.2 
            }}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster={logoStatic}
              className="h-36 w-36 sm:h-40 sm:w-40 object-cover rounded-3xl"
            >
              <source src={logoAnimated} type="video/mp4" />
              <img 
                src={logoStatic} 
                alt="ExpenX" 
                className="h-36 w-36 sm:h-40 sm:w-40 object-cover rounded-3xl"
              />
            </video>
          </motion.div>
        </motion.div>

      </motion.div>
    </motion.div>
  );
}

export default SplashScreen;
