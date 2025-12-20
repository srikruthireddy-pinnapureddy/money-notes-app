import logoAnimated from "@/assets/logo-animated.mp4";
import logoStatic from "@/assets/logo.png";

interface AnimatedLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showStatic?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export const AnimatedLogo = ({ 
  className = "", 
  size = "md",
  showStatic = false 
}: AnimatedLogoProps) => {
  const sizeClass = sizeClasses[size];

  if (showStatic) {
    return (
      <img 
        src={logoStatic} 
        alt="ExpenX" 
        className={`${sizeClass} rounded-xl object-cover ${className}`}
      />
    );
  }

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className={`${sizeClass} rounded-xl object-cover ${className}`}
    >
      <source src={logoAnimated} type="video/mp4" />
      <img 
        src={logoStatic} 
        alt="ExpenX" 
        className={`${sizeClass} rounded-xl object-cover`}
      />
    </video>
  );
};

export default AnimatedLogo;
