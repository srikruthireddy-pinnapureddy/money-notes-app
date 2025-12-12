import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings, ScanBarcode } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { SpaceSwitcher, GroupSpace, PersonalSpace } from "@/components/spaces";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

type Space = "groups" | "personal";

type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [activeSpace, setActiveSpace] = useState<Space>("groups");
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Handle scroll to show/hide navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // Show navbar when scrolling up, hide when scrolling down
      if (scrollDelta > 5 && currentScrollY > 60) {
        setIsNavbarVisible(false);
      } else if (scrollDelta < -5 || currentScrollY <= 10) {
        setIsNavbarVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBarcodeScan = (result: string) => {
    setShowScanner(false);
    toast({
      title: "Barcode Scanned",
      description: `Code: ${result}`,
    });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/");
      } else {
        fetchGroups();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select(`*, group_members!inner(user_id)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch groups",
        variant: "destructive",
      });
    }
  };

  const handleSpaceChange = (space: Space) => {
    setDirection(space === "personal" ? 1 : -1);
    setActiveSpace(space);
  };

  // Swipe gesture handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeSpace === "groups") {
      handleSpaceChange("personal");
    } else if (isRightSwipe && activeSpace === "personal") {
      handleSpaceChange("groups");
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <img src={logo} alt="ExpenX" className="h-16 w-16 mb-4" />
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header - Hides on scroll down, shows on scroll up */}
      <motion.header 
        className={cn(
          "border-b bg-background/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 safe-top"
        )}
        initial={{ y: 0 }}
        animate={{ y: isNavbarVisible ? 0 : -80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ExpenX" className="h-9 w-9" />
            <div>
              <h1 className="text-lg font-bold">ExpenX</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {session?.user?.email || session?.user?.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowScanner(true)}>
              <ScanBarcode className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Spacer for fixed header */}
      <div className="h-[72px]" />

      {/* Space Switcher */}
      <div className="px-4 pt-4 pb-2">
        <SpaceSwitcher activeSpace={activeSpace} onSpaceChange={handleSpaceChange} />
      </div>

      {/* Space Content with Slide Animation */}
      <main 
        ref={containerRef}
        className="px-4 py-4 pb-24 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeSpace}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
          >
            {activeSpace === "groups" ? (
              <GroupSpace groups={groups} onGroupCreated={fetchGroups} />
            ) : (
              <PersonalSpace />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
