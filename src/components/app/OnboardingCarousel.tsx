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

  // Micro-animation components for each slide
  const renderIllustration = () => {
    switch (slide.illustration) {
      case "card-enter":
        return (
          <motion.div
            initial={{ x: 100, opacity: 0, rotate: 5 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="w-48 h-28 bg-card rounded-xl shadow-lg border border-border p-4 mx-auto"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-2 w-14 bg-muted/60 rounded mt-1" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-2 w-16 bg-muted/40 rounded" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-sm font-bold text-primary"
              >
                ₹1,250
              </motion.div>
            </div>
          </motion.div>
        );
      case "group-chip":
        return (
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg"
              >
                {["JD", "AR", "SK"][i]}
              </motion.div>
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="w-12 h-12 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground"
            >
              +3
            </motion.div>
          </div>
        );
      case "chart-grow":
        return (
          <div className="flex items-end justify-center gap-2 h-24">
            {[40, 65, 45, 80, 60].map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                className={`w-8 rounded-t-lg ${i === 3 ? "bg-primary" : "bg-primary/30"}`}
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-gradient-to-br from-purple-50 via-white to-purple-100 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950 flex flex-col"
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
