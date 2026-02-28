import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIChatButtonProps {
  onClick: () => void;
  className?: string;
}

export function AIChatButton({ onClick, className }: AIChatButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "fixed bottom-24 right-6 z-30 safe-bottom",
        "h-14 w-14 rounded-full",
        "bg-gradient-to-br from-primary to-[hsl(280_70%_60%)]",
        "text-primary-foreground shadow-lg",
        "flex items-center justify-center",
        "hover:shadow-xl active:scale-95 transition-shadow",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Sparkles className="h-6 w-6" />
      <span className="sr-only">AI Assistant</span>
    </motion.button>
  );
}
