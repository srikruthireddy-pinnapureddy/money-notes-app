import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings, ScanBarcode, LogOut, User, Menu, UsersRound, TrendingUp } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { GroupSpace, PersonalSpace } from "@/components/spaces";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const {
    toast
  } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [activeSpace, setActiveSpace] = useState<Space>("groups");
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    window.addEventListener("scroll", handleScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const handleBarcodeScan = (result: string) => {
    setShowScanner(false);
    toast({
      title: "Barcode Scanned",
      description: `Code: ${result}`
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    const email = session?.user?.email;
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/");
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
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
      const {
        data,
        error
      } = await supabase.from("groups").select(`*, group_members!inner(user_id)`).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch groups",
        variant: "destructive"
      });
    }
  };
  const handleSpaceChange = (space: Space) => {
    setDirection(space === "personal" ? 1 : -1);
    setActiveSpace(space);
    setIsMenuOpen(false);
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
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%",
      opacity: 0
    })
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} className="flex flex-col items-center">
          <AnimatedLogo size="lg" className="mb-4" />
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </motion.div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header - Hides on scroll down, shows on scroll up */}
      <motion.nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 safe-top",
          "bg-background/80 backdrop-blur-md shadow-sm"
        )} 
        initial={{ y: 0 }} 
        animate={{ y: isNavbarVisible ? 0 : -80 }} 
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Hamburger Menu */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <AnimatedLogo size="sm" />
                    <span>ExpenX</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-3">
                    Spaces
                  </p>
                  <button
                    onClick={() => handleSpaceChange("groups")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                      activeSpace === "groups" 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200",
                      activeSpace === "groups"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    )}>
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <span className="font-medium">Group Space</span>
                  </button>
                  <button
                    onClick={() => handleSpaceChange("personal")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                      activeSpace === "personal" 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200",
                      activeSpace === "personal"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}>
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <span className="font-medium">Personal Space</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            
            <AnimatedLogo size="sm" />
            <h1 className="text-lg font-bold text-foreground">ExpenX</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {activeSpace === "groups" && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-full hover:bg-muted"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode className="h-5 w-5" />
              </Button>
            )}
            
            <NotificationBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg">
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.nav>

      {/* Spacer for fixed header */}
      <div className="h-[72px]" />

      {/* Space Content with Slide Animation */}
      <main ref={containerRef} className="px-4 py-4 pb-24 overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={activeSpace} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{
          x: {
            type: "spring",
            stiffness: 300,
            damping: 30
          },
          opacity: {
            duration: 0.2
          }
        }}>
            {activeSpace === "groups" ? <GroupSpace groups={groups} onGroupCreated={fetchGroups} /> : <PersonalSpace />}
          </motion.div>
        </AnimatePresence>
      </main>

      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}
    </div>;
};
export default Dashboard;