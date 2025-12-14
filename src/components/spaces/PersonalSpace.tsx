import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Receipt
} from "lucide-react";
import { AddTransactionDrawer } from "@/components/AddTransactionDrawer";
import { TransactionCard } from "@/components/TransactionCard";
import { InvestmentsTab } from "@/components/investments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  notes: string | null;
  payment_mode: string | null;
  transaction_date: string;
  created_at: string;
};

type DateRange = "today" | "week" | "month" | "all";
type ActiveTab = "transactions" | "investments";

const categories = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Other"
];

export function PersonalSpace() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("transactions");

  useEffect(() => {
    fetchTransactions();
  }, [dateRange, categoryFilter]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return null;
    }
  };

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from("personal_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query
          .gte("transaction_date", dateFilter.start.toISOString())
          .lte("transaction_date", dateFilter.end.toISOString());
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("personal_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Transaction deleted" });
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setAddDrawerOpen(true);
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions" className="gap-2">
            <Receipt className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="investments" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Investments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6 space-y-6">
        {/* Single Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl p-3 bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80 mb-0.5">Net Balance</p>
                <h2 className="text-2xl font-bold">
                  ${Math.abs(netBalance).toFixed(2)}
                  {netBalance < 0 && <span className="text-sm ml-1 opacity-80">deficit</span>}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs opacity-70">Income</p>
                  <p className="font-semibold flex items-center gap-1 justify-end">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    ${totalIncome.toFixed(0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">Expense</p>
                  <p className="font-semibold flex items-center gap-1 justify-end">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    ${totalExpense.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
          </motion.div>

          {/* Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2"
          >
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Transactions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Transactions</h3>
              <span className="text-sm text-muted-foreground">{transactions.length} entries</span>
            </div>

            {transactions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No transactions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start tracking your finances
                </p>
                <Button onClick={() => setAddDrawerOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + index * 0.03 }}
                  >
                    <TransactionCard
                      transaction={transaction}
                      onEdit={() => handleEdit(transaction)}
                      onDelete={() => handleDelete(transaction.id)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* FAB for Transactions */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="fixed bottom-6 right-6 z-20 safe-bottom"
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-2xl"
              onClick={() => {
                setEditingTransaction(null);
                setAddDrawerOpen(true);
              }}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </motion.div>
        </TabsContent>

        <TabsContent value="investments" className="mt-6">
          <InvestmentsTab />
        </TabsContent>
      </Tabs>

      <AddTransactionDrawer
        open={addDrawerOpen}
        onOpenChange={(open) => {
          setAddDrawerOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        onTransactionAdded={fetchTransactions}
        editingTransaction={editingTransaction}
        categories={categories}
      />
    </div>
  );
}
