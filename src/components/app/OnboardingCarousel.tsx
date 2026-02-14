import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createDemoTransactions } from "@/utils/demoData";
import { triggerHapticFeedback } from "@/utils/haptics";
import { 
  Receipt, 
  Users, 
  LineChart,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2
} from "lucide-react";

interface OnboardingCarouselProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Receipt,
    title: "Track Expenses Easily",
    description: "Add expenses on the go with smart receipt scanning and automatic categorization.",
    color: "from-primary to-purple-400",
    illustration: "card-enter",
  },
  {
    icon: Users,
    title: "Split Bills with Friends",
    description: "Create groups for trips, roommates, or events. Split expenses fairly with one tap.",
    color: "from-blue-500 to-cyan-400",
    illustration: "group-chip",
  },
  {
    icon: LineChart,
    title: "Smart Settlements & Insights",
    description: "Minimize transactions to settle up. Get insights into your spending patterns.",
    color: "from-emerald-500 to-teal-400",
    illustration: "chart-grow",
  },
];

export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const { toast } = useToast();

  const isLastSlide = currentIndex === slides.length - 1;
  const slide = slides[currentIndex];
  const Icon = slide.icon;

  const goToSlide = useCallback((index: number) => {
    if (index !== currentIndex) {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
      triggerHapticFeedback("light");
    }
  }, [currentIndex]);

  const handleNext = () => {
    if (isLastSlide) {
      finish();
    } else {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
      triggerHapticFeedback("light");
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
      triggerHapticFeedback("light");
    }
  };

  const finish = async () => {
    setIsCreatingDemo(true);
    
    try {
      const created = await createDemoTransactions();
      if (created) {
        toast({
          title: "Welcome to ExpenX!",
          description: "We've added some sample transactions to help you get started.",
        });
      }
    } catch (error) {
      console.error("Error creating demo data:", error);
    }
    
    localStorage.setItem("hasOnboarded", "true");
    setIsCreatingDemo(false);
    onComplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "ArrowLeft" && currentIndex > 0) handlePrev();
    if (e.key === "Enter" && isLastSlide) finish();
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: { offset: { x: number }; velocity: { x: number } }) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      // Swiped left - go next
      if (!isLastSlide) {
        setDirection(1);
        setCurrentIndex((prev) => prev + 1);
        triggerHapticFeedback("medium");
      }
    } else if (swipe > swipeConfidenceThreshold) {
      // Swiped right - go prev
      if (currentIndex > 0) {
        setDirection(-1);
        setCurrentIndex((prev) => prev - 1);
        triggerHapticFeedback("medium");
      }
    }
  };

  // Micro-animation components for each slide — branded EX style
  const renderIllustration = () => {
    switch (slide.illustration) {
      case "card-enter":
        return (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 120 }}
            className="relative w-56 mx-auto"
          >
            {/* Glow behind card */}
            <motion.div
              className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 blur-xl"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Main card */}
            <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50 p-5 overflow-hidden">
              {/* Shimmer stripe */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.div
                  className="absolute inset-0 -translate-x-full"
                  animate={{ translateX: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                  style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.08), transparent)", width: "50%" }}
                />
              </motion.div>

              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20"
                >
                  <Receipt className="h-5 w-5 text-primary-foreground" />
                </motion.div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-muted rounded-full" />
                  <div className="h-2 w-16 bg-muted/50 rounded-full" />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/40">
                <div className="h-2 w-20 bg-muted/40 rounded-full" />
                <motion.span
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                  className="text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                >
                  ₹1,250
                </motion.span>
              </div>
            </div>
          </motion.div>
        );
      case "group-chip":
        return (
          <div className="flex justify-center items-center gap-3">
            {[
              { initials: "JD", gradient: "from-blue-400 to-indigo-500" },
              { initials: "AR", gradient: "from-primary to-purple-500" },
              { initials: "SK", gradient: "from-emerald-400 to-teal-500" },
            ].map((member, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, y: 30, rotate: -15 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 180 }}
                className="relative"
              >
                <motion.div
                  className={`absolute -inset-1 rounded-full bg-gradient-to-br ${member.gradient} blur-md opacity-40`}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
                <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-background`}>
                  {member.initials}
                </div>
              </motion.div>
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.55, type: "spring" }}
              className="w-14 h-14 rounded-full bg-muted/50 border-2 border-dashed border-primary/30 flex items-center justify-center text-muted-foreground font-medium backdrop-blur-sm"
            >
              +3
            </motion.div>
          </div>
        );
      case "chart-grow":
        return (
          <div className="flex items-end justify-center gap-2.5 h-28 px-4">
            {[
              { h: 35, color: "from-primary/40 to-primary/20" },
              { h: 60, color: "from-primary/50 to-primary/30" },
              { h: 42, color: "from-primary/40 to-primary/20" },
              { h: 85, color: "from-primary to-accent" },
              { h: 55, color: "from-primary/50 to-primary/30" },
            ].map((bar, i) => (
              <motion.div
                key={i}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${bar.h}%`, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-9 rounded-xl overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-t ${bar.color}`} />
                {i === 3 && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/10"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10 flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Onboarding carousel"
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            className="text-center w-full cursor-grab active:cursor-grabbing touch-pan-y"
            aria-live="polite"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center mb-8 shadow-lg`}
            >
              <Icon className="h-10 w-10 text-white" />
            </motion.div>

            {/* Micro Animation */}
            <div className="mb-8 min-h-[120px] flex items-center justify-center">
              {renderIllustration()}
            </div>

            {/* Title */}
            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-2xl md:text-3xl font-bold mb-4 text-foreground"
            >
              {slide.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground leading-relaxed text-base md:text-lg"
            >
              {slide.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mt-10">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? "w-8 bg-primary" 
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? "step" : undefined}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-center gap-4 w-full">
          {isLastSlide ? (
            <>
              <Button
                size="lg"
                onClick={finish}
                disabled={isCreatingDemo}
                className="min-w-[160px] h-12 text-base gap-2 shadow-lg shadow-primary/20"
              >
                {isCreatingDemo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get Started
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={finish}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
              <Button
                size="lg"
                onClick={handleNext}
                className="min-w-[120px] h-12 text-base gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingCarousel;
