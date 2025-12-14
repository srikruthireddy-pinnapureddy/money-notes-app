import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Wallet,
  BarChart3,
  PieChart,
  Loader2,
} from "lucide-react";
import { InvestmentCard, type Investment } from "./InvestmentCard";
import { AddInvestmentDrawer } from "./AddInvestmentDrawer";
import { InvestmentDetailSheet } from "./InvestmentDetailSheet";

type InvestmentType = "all" | "sip" | "etf" | "stock" | "mutual_fund" | "other";

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
    <div className="space-y-6">
      {/* Compact Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 opacity-80" />
              <p className="text-xs opacity-80">Portfolio</p>
            </div>
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}{totalReturnsPercent.toFixed(1)}%
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">₹{totalCurrentValue.toLocaleString()}</h2>
          <div className="flex gap-4 text-xs opacity-80">
            <span>Invested: ₹{totalInvested.toLocaleString()}</span>
            <span className={isPositive ? "text-emerald-200" : "text-rose-200"}>
              Returns: {isPositive ? "+" : ""}₹{Math.abs(totalReturns).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10" />
      </motion.div>

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
