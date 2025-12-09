import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Loader2, 
  Settings, 
  ArrowUpCircle, 
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Filter,
  Users
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { AddTransactionDrawer } from "@/components/AddTransactionDrawer";
import { TransactionCard } from "@/components/TransactionCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const PersonalLedger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
        fetchTransactions();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [dateRange, categoryFilter, session]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 safe-top">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">ExpenX</h1>
            <p className="text-sm text-muted-foreground truncate">
              {session?.user?.email || session?.user?.phone}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {/* Navigation Tabs */}
        <Tabs defaultValue="ledger" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ledger" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              My Ledger
            </TabsTrigger>
            <TabsTrigger 
              value="groups" 
              className="flex items-center gap-2"
              onClick={() => navigate("/dashboard")}
            >
              <Users className="h-4 w-4" />
              My Groups
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3 bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <p className="text-lg font-bold text-emerald-500">
              ${totalIncome.toFixed(2)}
            </p>
          </Card>
          <Card className="p-3 bg-rose-500/10 border-rose-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">Expense</span>
            </div>
            <p className="text-lg font-bold text-rose-500">
              ${totalExpense.toFixed(2)}
            </p>
          </Card>
          <Card className={`p-3 ${netBalance >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-foreground" />
              <span className="text-xs text-muted-foreground">Net</span>
            </div>
            <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${netBalance.toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
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
        </div>

        {/* Transactions List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Transactions</h2>
          <span className="text-sm text-muted-foreground">{transactions.length} entries</span>
        </div>

        {transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-2">No transactions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking your income and expenses
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onEdit={() => handleEdit(transaction)}
                onDelete={() => handleDelete(transaction.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20 safe-bottom">
        <Button
          size="lg"
          className="h-16 w-16 rounded-full shadow-2xl"
          onClick={() => {
            setEditingTransaction(null);
            setAddDrawerOpen(true);
          }}
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

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
};

export default PersonalLedger;