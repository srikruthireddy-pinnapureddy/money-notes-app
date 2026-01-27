import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimatePresence, motion } from "framer-motion";
import { SplashScreen, OnboardingCarousel } from "@/components/app";
import { supabase } from "@/integrations/supabase/client";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import PersonalLedger from "./pages/PersonalLedger";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import JoinGroup from "./pages/JoinGroup";
import GroupDetail from "./pages/GroupDetail";
import Install from "./pages/Install";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App Shell handles splash and onboarding flow
function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [appPhase, setAppPhase] = useState<"splash" | "onboarding" | "ready">("splash");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check auth status
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Determine app phase after splash
  const handleSplashFinish = useCallback(() => {
    const hasOnboarded = localStorage.getItem("hasOnboarded") === "true";
    
    if (!hasOnboarded) {
      setAppPhase("onboarding");
    } else {
      setAppPhase("ready");
      // Auto-navigate authenticated users to dashboard
      if (isAuthenticated && location.pathname === "/") {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback(() => {
    setAppPhase("ready");
    // Navigate to auth if not authenticated, dashboard if authenticated
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  }, [isAuthenticated, navigate]);

  // Page transition variants
  const pageTransition = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.2, ease: "easeInOut" }
  };

  return (
    <>
      {/* Splash Screen */}
      <AnimatePresence>
        {appPhase === "splash" && (
          <SplashScreen onFinish={handleSplashFinish} durationMs={2500} />
        )}
      </AnimatePresence>

      {/* Onboarding Carousel */}
      <AnimatePresence>
        {appPhase === "onboarding" && (
          <OnboardingCarousel onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {/* Main App Content */}
      <AnimatePresence mode="wait">
        {appPhase === "ready" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="min-h-screen"
          >
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ledger" element={<PersonalLedger />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/group/:id" element={<GroupDetail />} />
              <Route path="/join/:code" element={<JoinGroup />} />
              <Route path="/install" element={<Install />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
