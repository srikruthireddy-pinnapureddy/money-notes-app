import { useEffect, useState } from "react";
import logoAnimated from "@/assets/logo-animated.mp4";
import logoStatic from "@/assets/logo.png";
import logoWebp from "@/assets/logo.webp";
interface AnimatedLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "responsive";
  showStatic?: boolean;
}

// Fixed sizes for explicit size prop
const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  responsive: "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12",
};

export const AnimatedLogo = ({ 
  className = "", 
  size = "md",
  showStatic = false 
}: AnimatedLogoProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Check for reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", checkMobile);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  const sizeClass = sizeClasses[size];

  // Show static image on mobile for better performance or if user prefers reduced motion
  if (showStatic || (isMobile && size !== "lg") || prefersReducedMotion) {
    return (
      <picture>
        <source srcSet={logoWebp} type="image/webp" />
        <img 
          src={logoStatic} 
          alt="ExpenX" 
          loading="lazy"
          className={`${sizeClass} rounded-xl object-cover ${className}`}
        />
      </picture>
    );
  }

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster={logoStatic}
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
