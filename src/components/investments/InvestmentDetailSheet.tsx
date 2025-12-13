import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import type { Investment } from "./InvestmentCard";

type InvestmentTransaction = {
  id: string;
  type: string;
  units: number;
  amount: number;
  price_per_unit: number | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
};

type InvestmentDetailSheetProps = {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
};

const transactionTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  buy: { icon: ShoppingCart, label: "Buy", color: "text-emerald-500" },
  sell: { icon: ArrowUpRight, label: "Sell", color: "text-rose-500" },
  sip_installment: { icon: TrendingUp, label: "SIP Installment", color: "text-blue-500" },
  dividend: { icon: Coins, label: "Dividend", color: "text-amber-500" },
};

const typeLabels: Record<string, string> = {
  sip: "SIP",
  etf: "ETF",
  stock: "Stock",
  mutual_fund: "Mutual Fund",
  other: "Other",
};

export function InvestmentDetailSheet({
  investment,
  open,
  onOpenChange,
  onUpdate,
}: InvestmentDetailSheetProps) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Add transaction form
  const [txType, setTxType] = useState<string>("buy");
  const [txUnits, setTxUnits] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState<Date>(new Date());
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (investment && open) {
      fetchTransactions();
    }
  }, [investment, open]);

  const fetchTransactions = async () => {
    if (!investment) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("investment_transactions")
        .select("*")
        .eq("investment_id", investment.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
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

  const handleAddTransaction = async () => {
    if (!investment) return;
    if (!txAmount || parseFloat(txAmount) <= 0) {
      toast({ title: "Please enter valid amount", variant: "destructive" });
      return;
    }

    setTxLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const unitsValue = parseFloat(txUnits) || 0;
      const amountValue = parseFloat(txAmount);
      const pricePerUnit = unitsValue > 0 ? amountValue / unitsValue : null;

      // Insert transaction
      const { error: txError } = await supabase
        .from("investment_transactions")
        .insert([{
          user_id: user.id,
          investment_id: investment.id,
          type: txType,
          units: unitsValue,
          amount: amountValue,
          price_per_unit: pricePerUnit,
          transaction_date: format(txDate, "yyyy-MM-dd"),
        }]);

      if (txError) throw txError;

      // Update investment totals
      let newUnits = investment.units;
      let newInvested = investment.invested_amount;
      let newCurrent = investment.current_value;

      if (txType === "buy" || txType === "sip_installment") {
        newUnits += unitsValue;
        newInvested += amountValue;
        newCurrent += amountValue; // Assume current value increases by purchase amount
      } else if (txType === "sell") {
        newUnits -= unitsValue;
        newCurrent -= amountValue;
      } else if (txType === "dividend") {
        newCurrent += amountValue;
      }

      const { error: updateError } = await supabase
        .from("investments")
        .update({
          units: Math.max(0, newUnits),
          invested_amount: Math.max(0, newInvested),
          current_value: Math.max(0, newCurrent),
        })
        .eq("id", investment.id);

      if (updateError) throw updateError;

      toast({ title: "Transaction added!" });
      setAddDialogOpen(false);
      setTxType("buy");
      setTxUnits("");
      setTxAmount("");
      setTxDate(new Date());
      fetchTransactions();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTxLoading(false);
    }
  };

  if (!investment) return null;

  const returns = investment.current_value - investment.invested_amount;
  const returnsPercent = investment.invested_amount > 0 
    ? ((returns / investment.invested_amount) * 100) 
    : 0;
  const isPositive = returns >= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {investment.name}
            {investment.symbol && (
              <span className="text-sm text-muted-foreground font-normal">
                ({investment.symbol})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Card */}
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">
                {typeLabels[investment.type] || investment.type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {investment.units} units
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Invested</p>
                <p className="text-xl font-bold">₹{investment.invested_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-xl font-bold">₹{investment.current_value.toLocaleString()}</p>
              </div>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-xl ${
              isPositive ? "bg-emerald-500/10" : "bg-rose-500/10"
            }`}>
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-500" />
                )}
                <span className="text-sm font-medium">Total Returns</span>
              </div>
              <div className={`text-right ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                <p className="font-bold">
                  {isPositive ? "+" : ""}₹{Math.abs(returns).toLocaleString()}
                </p>
                <p className="text-sm">
                  ({isPositive ? "+" : ""}{returnsPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          </Card>

          {/* Add Transaction Button */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <Select value={txType} onValueChange={setTxType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                      <SelectItem value="sip_installment">SIP Installment</SelectItem>
                      <SelectItem value="dividend">Dividend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Units</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={txUnits}
                      onChange={(e) => setTxUnits(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      placeholder="₹0"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(txDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={txDate}
                        onSelect={(d) => d && setTxDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleAddTransaction}
                  disabled={txLoading}
                >
                  {txLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Transaction"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Transaction History */}
          <div>
            <h4 className="font-semibold mb-3">Transaction History</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm">Add your first transaction above</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx, index) => {
                  const config = transactionTypeConfig[tx.type] || transactionTypeConfig.buy;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${config.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{config.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.transaction_date), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              tx.type === "sell" ? "text-rose-500" : "text-emerald-500"
                            }`}>
                              {tx.type === "sell" ? "-" : "+"}₹{tx.amount.toLocaleString()}
                            </p>
                            {tx.units > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {tx.units} units
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
