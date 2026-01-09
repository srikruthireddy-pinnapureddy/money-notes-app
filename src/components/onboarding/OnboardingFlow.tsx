import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Receipt, 
  TrendingUp, 
  Bell, 
  Wallet,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check
} from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to ExpenX!",
    description: "Your smart expense tracking and group splitting companion. Let's take a quick tour of what you can do.",
    color: "from-primary to-accent",
  },
  {
    icon: Users,
    title: "Create Groups",
    description: "Set up groups for roommates, trips, events, or any shared expenses. Invite members with a simple link.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Receipt,
    title: "Track Expenses",
    description: "Add expenses and split them equally or customize amounts. Everyone sees what they owe in real-time.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: TrendingUp,
    title: "Smart Settlements",
    description: "Our algorithm calculates the minimum transactions needed to settle up. No more confusion!",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Wallet,
    title: "Personal Ledger",
    description: "Track your personal income and expenses. Set budgets and get alerts before you overspend.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Bell,
    title: "Stay Notified",
    description: "Get reminders for pending payments, mentions in group chats, and budget alerts.",
    color: "from-rose-500 to-red-500",
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-card border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}
              >
                <Icon className="h-10 w-10 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold mb-3"
              >
                {step.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground leading-relaxed"
              >
                {step.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mt-8 mb-6">
            {steps.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setDirection(index > currentStep ? 1 : -1);
                  setCurrentStep(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            {!isFirstStep ? (
              <Button variant="ghost" onClick={handlePrev} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip
              </Button>
            )}

            <Button onClick={handleNext} className="gap-1 min-w-[100px]">
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
