import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
// Logo
import { AnimatedLogo } from "@/components/AnimatedLogo";
// Feature images
import featureGroupExpenses from "@/assets/feature-group-expenses.png";
import featureReceiptScan from "@/assets/feature-receipt-scan.png";
import featureMultiCurrency from "@/assets/feature-multi-currency.png";
import featureSettlement from "@/assets/feature-settlement.png";
import featureCategories from "@/assets/feature-categories.png";
import featureSecurity from "@/assets/feature-security.png";

const Landing = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      image: featureGroupExpenses,
      title: "Group Expenses",
      description: "Create groups for trips, roommates, or events and track who owes what effortlessly.",
      animation: { scale: [1, 1.05, 1], transition: { duration: 2, repeat: Infinity } },
      hoverAnimation: { scale: 1.1, y: -5 },
    },
    {
      image: featureReceiptScan,
      title: "Smart Receipt Scanning",
      description: "Snap a photo of your receipt and let AI automatically extract the details.",
      animation: { y: [0, -8, 0], transition: { duration: 2, repeat: Infinity } },
      hoverAnimation: { scale: 1.1, rotate: 5 },
    },
    {
      image: featureMultiCurrency,
      title: "Multi-Currency Support",
      description: "Travel abroad? Handle expenses in any currency with automatic conversion.",
      animation: { rotate: [0, 5, -5, 0], transition: { duration: 4, repeat: Infinity } },
      hoverAnimation: { scale: 1.1 },
    },
    {
      image: featureSettlement,
      title: "Settlement Optimization",
      description: "Minimize the number of transactions needed to settle up within your group.",
      animation: { scale: [1, 1.03, 1], transition: { duration: 1.5, repeat: Infinity } },
      hoverAnimation: { scale: 1.1, y: -5 },
    },
    {
      image: featureCategories,
      title: "Expense Categories",
      description: "Organize expenses by category and gain insights into your spending patterns.",
      animation: { rotate: [0, 3, -3, 0], transition: { duration: 3, repeat: Infinity } },
      hoverAnimation: { scale: 1.1 },
    },
    {
      image: featureSecurity,
      title: "Secure & Private",
      description: "Your financial data is encrypted and only visible to your group members.",
      animation: { scale: [1, 1.08, 1], opacity: [1, 0.8, 1], transition: { duration: 2, repeat: Infinity } },
      hoverAnimation: { scale: 1.15 },
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <AnimatedLogo size="sm" className="h-10 w-10" />
            <span className="text-lg font-bold">ExpenX</span>
          </motion.div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" onClick={() => navigate("/auth")}>
                    Sign In
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={() => navigate("/auth")}>
                    Get Started
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
          >
            <span>Smart Expense Splitting</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            Split expenses with{" "}
            <motion.span
              className="text-primary inline-block"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              friends
            </motion.span>
            ,{" "}
            not friendships
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            ExpenX makes it easy to track shared expenses, split bills fairly, and settle up — 
            so you can focus on making memories, not doing math.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("/auth")}>
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to manage group expenses
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From weekend trips to shared apartments, ExpenX has you covered.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ 
                  y: -8, 
                  boxShadow: "0 20px 40px -15px rgba(0,0,0,0.1)",
                  borderColor: "hsl(var(--primary) / 0.3)"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="p-6 rounded-xl bg-background border border-border/50 cursor-pointer group"
              >
                <motion.div
                  animate={feature.animation}
                  whileHover={feature.hoverAnimation}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="mb-4 flex justify-center"
                >
                  <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-32 h-32 object-contain"
                  />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg">
              Get started in three simple steps
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { step: "1", title: "Create a Group", description: "Set up a group for your trip, household, or event." },
              { step: "2", title: "Add Expenses", description: "Log expenses as they happen, or scan receipts for auto-fill." },
              { step: "3", title: "Settle Up", description: "See who owes whom and settle with minimal transactions." },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                variants={itemVariants}
                className="text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4"
                >
                  {item.step}
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={scaleIn}
        className="px-4 py-16 bg-primary/5"
      >
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Ready to simplify expense splitting?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-muted-foreground text-lg mb-8"
          >
            Join thousands of users who have already made group expenses stress-free.
          </motion.p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("/auth")}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="px-4 py-8 border-t border-border/50"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AnimatedLogo size="sm" />
            <span className="font-semibold">ExpenX</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ExpenX. All rights reserved.
          </p>
        </div>
      </motion.footer>
    </div>
  );
};

export default Landing;
