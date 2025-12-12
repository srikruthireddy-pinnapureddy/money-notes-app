import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatIconProps {
  onClick: () => void;
  hasUnread?: boolean;
  className?: string;
}

export function ChatIcon({ onClick, hasUnread = false, className }: ChatIconProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg",
        "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
        "hover:shadow-xl hover:scale-105 active:scale-95",
        "transition-all duration-200",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-accent/50 to-primary opacity-0 hover:opacity-20 transition-opacity" />
      
      {/* Icon */}
      <MessageCircle className="h-6 w-6" />
      
      {/* Three-dot animation when active */}
      {hasUnread && (
        <motion.div 
          className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-accent"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <div className="flex gap-0.5">
            <motion.span 
              className="w-1 h-1 bg-accent-foreground rounded-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            />
            <motion.span 
              className="w-1 h-1 bg-accent-foreground rounded-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span 
              className="w-1 h-1 bg-accent-foreground rounded-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}
