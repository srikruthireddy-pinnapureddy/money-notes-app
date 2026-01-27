import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          light: "hsl(var(--destructive-light))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      spacing: {
        // 8px base spacing scale
        "0.5": "0.125rem", // 2px
        "1": "0.25rem",    // 4px
        "2": "0.5rem",     // 8px
        "3": "0.75rem",    // 12px
        "4": "1rem",       // 16px
        "5": "1.25rem",    // 20px
        "6": "1.5rem",     // 24px
        "8": "2rem",       // 32px
        "10": "2.5rem",    // 40px
        "12": "3rem",      // 48px
        "16": "4rem",      // 64px
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        "card": "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        "glow": "var(--shadow-glow)",
      },
      fontSize: {
        // Hero sizes for dashboard
        "hero": ["1.75rem", { lineHeight: "2.25rem", fontWeight: "700" }], // 28px mobile
        "hero-lg": ["2rem", { lineHeight: "2.5rem", fontWeight: "700" }],   // 32px desktop
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "card-lift": {
          "0%": { transform: "translateY(0)", boxShadow: "var(--shadow-card)" },
          "100%": { transform: "translateY(-6px)", boxShadow: "var(--shadow-card-hover)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pulse-glow": "pulse-glow 1.6s ease-in-out infinite",
        "card-lift": "card-lift 0.14s ease forwards",
      },
      transitionDuration: {
        "140": "140ms",
        "200": "200ms",
        "300": "300ms",
        "350": "350ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
