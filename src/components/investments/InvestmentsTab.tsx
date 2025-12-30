import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Loader2,
  Sparkles,
  Target,
  Calculator,
  ArrowUpRight,
  Percent,
  Coins,
  Landmark,
  ChevronDown,
} from "lucide-react";
import { InvestmentCard, type Investment } from "./InvestmentCard";
import { AddInvestmentDrawer } from "./AddInvestmentDrawer";
import { InvestmentDetailSheet } from "./InvestmentDetailSheet";
import { AnimatedCounter } from "./AnimatedCounter";
import { PortfolioAllocationChart } from "./PortfolioAllocationChart";
import { QuickStatsGrid } from "./QuickStatsGrid";
import { GoalProgressCard } from "./GoalProgressCard";
import { SIPCalculator } from "./SIPCalculator";
import { LumpSumCalculator } from "./LumpSumCalculator";
import { SIPvsLumpSumComparison } from "./SIPvsLumpSumComparison";
import { StepUpSIPCalculator } from "./StepUpSIPCalculator";
import { GoalBasedCalculator } from "./GoalBasedCalculator";
import { RDCalculator } from "./RDCalculator";
import { FDCalculator } from "./FDCalculator";

type InvestmentType = "all" | "sip" | "etf" | "stock" | "mutual_fund" | "other";

type CalculatorType = "goal" | "sipVsLump" | "stepUp" | "sip" | "lumpSum" | "fd" | "rd" | null;

const calculatorButtons = [
  { id: "goal" as const, label: "Goal-Based", icon: Target, color: "from-violet-500 to-purple-600" },
  { id: "sipVsLump" as const, label: "SIP vs Lump Sum", icon: ArrowUpRight, color: "from-blue-500 to-cyan-500" },
  { id: "stepUp" as const, label: "Step-Up SIP", icon: TrendingUp, color: "from-emerald-500 to-green-600" },
  { id: "sip" as const, label: "SIP Calculator", icon: Calculator, color: "from-violet-500 to-indigo-600" },
  { id: "lumpSum" as const, label: "Lump Sum", icon: Coins, color: "from-amber-500 to-orange-500" },
  { id: "fd" as const, label: "FD Calculator", icon: Landmark, color: "from-rose-500 to-pink-600" },
  { id: "rd" as const, label: "RD Calculator", icon: Percent, color: "from-teal-500 to-cyan-600" },
];

export function InvestmentsTab() {
  const { toast } = useToast();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<InvestmentType>("all");
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>(null);

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvestments((data || []) as Investment[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!investmentToDelete) return;
    try {
      const { error } = await supabase
        .from("investments")
        .delete()
        .eq("id", investmentToDelete.id);

      if (error) throw error;
      toast({ title: "Investment deleted" });
      fetchInvestments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setInvestmentToDelete(null);
    }
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setAddDrawerOpen(true);
  };

  const handleCardClick = (investment: Investment) => {
    setSelectedInvestment(investment);
    setDetailSheetOpen(true);
  };

  const toggleCalculator = (calculatorId: CalculatorType) => {
    setActiveCalculator(prev => prev === calculatorId ? null : calculatorId);
  };

  const renderActiveCalculator = () => {
    switch (activeCalculator) {
      case "goal": return <GoalBasedCalculator />;
      case "sipVsLump": return <SIPvsLumpSumComparison />;
      case "stepUp": return <StepUpSIPCalculator />;
      case "sip": return <SIPCalculator />;
      case "lumpSum": return <LumpSumCalculator />;
      case "fd": return <FDCalculator />;
      case "rd": return <RDCalculator />;
      default: return null;
    }
  };

  const filteredInvestments = activeType === "all" 
    ? investments 
    : investments.filter(inv => inv.type === activeType);

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.invested_amount), 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + Number(inv.current_value), 0);
  const totalReturns = totalCurrentValue - totalInvested;
  const totalReturnsPercent = totalInvested > 0 ? ((totalReturns / totalInvested) * 100) : 0;
  const isPositive = totalReturns >= 0;

  // Count by type
  const typeCounts = investments.reduce((acc, inv) => {
    acc[inv.type] = (acc[inv.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white"
      >
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute right-1/3 top-1/2 w-2 h-2 rounded-full bg-white/30 animate-pulse" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="p-1.5 rounded-lg bg-white/20"
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
              <p className="text-sm font-medium opacity-90">Total Portfolio Value</p>
            </div>
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${isPositive ? 'bg-emerald-500/30' : 'bg-rose-500/30'}`}
            >
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {isPositive ? "+" : ""}{totalReturnsPercent.toFixed(1)}%
            </motion.div>
          </div>
          
          <h2 className="text-3xl font-bold mb-3">
            <AnimatedCounter value={totalCurrentValue} prefix="₹" />
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
              <p className="text-xs opacity-70 mb-0.5">Invested</p>
              <p className="font-semibold">
                <AnimatedCounter value={totalInvested} prefix="₹" />
              </p>
            </div>
            <div className={`rounded-xl p-2.5 backdrop-blur-sm ${isPositive ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              <p className="text-xs opacity-70 mb-0.5">Returns</p>
              <p className="font-semibold">
                {isPositive ? "+" : "-"}
                <AnimatedCounter value={Math.abs(totalReturns)} prefix="₹" />
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      {investments.length > 0 && <QuickStatsGrid investments={investments} />}

      {/* Portfolio Allocation Chart */}
      {investments.length > 0 && <PortfolioAllocationChart investments={investments} />}

      {/* Goal Progress Card */}
      {investments.length > 0 && <GoalProgressCard investments={investments} />}

      {/* Calculators Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Investment Calculators
        </h3>
        
        {/* Calculator Toggle Buttons */}
        <div className="flex flex-wrap gap-2">
          {calculatorButtons.map((calc) => {
            const isActive = activeCalculator === calc.id;
            const Icon = calc.icon;
            return (
              <Button
                key={calc.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCalculator(calc.id)}
                className={`gap-2 transition-all ${
                  isActive 
                    ? `bg-gradient-to-r ${calc.color} text-white border-0 shadow-lg` 
                    : "hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {calc.label}
                <ChevronDown className={`h-3 w-3 transition-transform ${isActive ? "rotate-180" : ""}`} />
              </Button>
            );
          })}
        </div>

        {/* Active Calculator Content */}
        <AnimatePresence mode="wait">
          {activeCalculator && (
            <motion.div
              key={activeCalculator}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                {renderActiveCalculator()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Type Tabs */}
      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as InvestmentType)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="gap-1">
            All
            <span className="text-xs text-muted-foreground">({investments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="sip" className="gap-1">
            SIP
            {typeCounts.sip && <span className="text-xs text-muted-foreground">({typeCounts.sip})</span>}
          </TabsTrigger>
          <TabsTrigger value="etf" className="gap-1">
            ETF
            {typeCounts.etf && <span className="text-xs text-muted-foreground">({typeCounts.etf})</span>}
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1">
            Stocks
            {typeCounts.stock && <span className="text-xs text-muted-foreground">({typeCounts.stock})</span>}
          </TabsTrigger>
          <TabsTrigger value="mutual_fund" className="gap-1">
            MF
            {typeCounts.mutual_fund && <span className="text-xs text-muted-foreground">({typeCounts.mutual_fund})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeType} className="mt-4">
          {filteredInvestments.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <PieChart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No investments yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start building your portfolio
              </p>
              <Button onClick={() => setAddDrawerOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Investment
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredInvestments.map((investment, index) => (
                  <motion.div
                    key={investment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <InvestmentCard
                      investment={investment}
                      onEdit={() => handleEdit(investment)}
                      onDelete={() => {
                        setInvestmentToDelete(investment);
                        setDeleteDialogOpen(true);
                      }}
                      onClick={() => handleCardClick(investment)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* FAB */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="fixed bottom-6 right-6 z-20 safe-bottom"
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-2xl bg-violet-600 hover:bg-violet-700"
          onClick={() => {
            setEditingInvestment(null);
            setAddDrawerOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Add/Edit Drawer */}
      <AddInvestmentDrawer
        open={addDrawerOpen}
        onOpenChange={(open) => {
          setAddDrawerOpen(open);
          if (!open) setEditingInvestment(null);
        }}
        onInvestmentAdded={fetchInvestments}
        editingInvestment={editingInvestment}
      />

      {/* Detail Sheet */}
      <InvestmentDetailSheet
        investment={selectedInvestment}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onUpdate={fetchInvestments}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{investmentToDelete?.name}" and all its transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
