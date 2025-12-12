import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  Loader2, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CircleDollarSign,
  MoreHorizontal,
  FileText,
  Tag,
  StickyNote,
  X,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  notes: string | null;
  payment_mode: string | null;
  transaction_date: string;
};

interface AddTransactionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded: () => void;
  editingTransaction?: Transaction | null;
  categories: string[];
}

const paymentModes = [
  { value: "cash", label: "Cash", icon: Wallet },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "bank_transfer", label: "Bank", icon: Building2 },
  { value: "wallet", label: "Wallet", icon: CircleDollarSign },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

export function AddTransactionDrawer({
  open,
  onOpenChange,
  onTransactionAdded,
  editingTransaction,
  categories,
}: AddTransactionDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setTitle(editingTransaction.notes?.split('\n')[0] || "");
      setCategory(editingTransaction.category || "");
      setNotes(editingTransaction.notes || "");
      setPaymentMode(editingTransaction.payment_mode || "cash");
      setDate(new Date(editingTransaction.transaction_date));
    } else {
      resetForm();
    }
  }, [editingTransaction, open]);

  const resetForm = () => {
    setType("expense");
    setAmount("");
    setTitle("");
    setCategory("");
    setCustomCategory("");
    setNotes("");
    setPaymentMode("cash");
    setDate(new Date());
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for this transaction",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fullNotes = notes ? `${title}\n${notes}` : title;

      // Use custom category if "Other" is selected
      const finalCategory = category === "__other__" ? customCategory.trim() : category;

      const transactionData = {
        user_id: user.id,
        type,
        amount: Number(amount),
        category: finalCategory || null,
        notes: fullNotes,
        payment_mode: paymentMode,
        transaction_date: date.toISOString(),
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from("personal_transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id);

        if (error) throw error;
        toast({ title: "Transaction updated" });
      } else {
        const { error } = await supabase
          .from("personal_transactions")
          .insert(transactionData);

        if (error) throw error;
        toast({ title: "Transaction added" });
      }

      await onTransactionAdded();
      resetForm();
      onOpenChange(false);
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto">
          {/* Header with Type Toggle */}
          <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingTransaction ? "Edit Transaction" : "New Transaction"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Type Toggle - Interactive Pills */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <motion.button
                onClick={() => setType("expense")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                  type === "expense" 
                    ? "bg-rose-500 text-white shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileTap={{ scale: 0.98 }}
              >
                <TrendingDown className="h-4 w-4" />
                Expense
              </motion.button>
              <motion.button
                onClick={() => setType("income")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                  type === "income" 
                    ? "bg-emerald-500 text-white shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileTap={{ scale: 0.98 }}
              >
                <TrendingUp className="h-4 w-4" />
                Income
              </motion.button>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-5">
            {/* Title Field */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Title
              </div>
              <Input
                placeholder="What's this for?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 text-lg border-2 focus:border-primary transition-colors"
              />
            </motion.div>

            {/* Amount Field - Large & Prominent */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CircleDollarSign className="h-4 w-4" />
                Amount
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(
                    "h-16 text-3xl font-bold pl-10 border-2 transition-colors",
                    type === "expense" 
                      ? "focus:border-rose-500" 
                      : "focus:border-emerald-500"
                  )}
                />
              </div>
            </motion.div>

            {/* Category */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Category
              </div>
              <Select value={category} onValueChange={(val) => {
                setCategory(val);
                if (val !== "__other__") {
                  setCustomCategory("");
                }
              }}>
                <SelectTrigger className="h-12 border-2 focus:border-primary">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="py-3">
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__" className="py-3 border-t mt-1">
                    <div className="flex items-center gap-2">
                      <MoreHorizontal className="h-4 w-4" />
                      Other (Custom)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom Category Input */}
              <AnimatePresence>
                {category === "__other__" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Input
                      placeholder="Enter custom category..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="h-12 border-2 focus:border-primary mt-2"
                      autoFocus
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Date Picker */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                Date
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal border-2 hover:border-primary",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span className="text-base">
                      {date ? format(date, "MMMM do, yyyy") : "Pick a date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </motion.div>

            {/* Payment Mode - Interactive Chips */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Payment Mode
              </div>
              <div className="grid grid-cols-3 gap-2">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.value;
                  return (
                    <motion.button
                      key={mode.value}
                      onClick={() => setPaymentMode(mode.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      )}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className={cn("h-5 w-5", isSelected && "text-primary")} />
                      <span className="text-xs font-medium">{mode.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Notes */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <StickyNote className="h-4 w-4" />
                Notes (optional)
              </div>
              <Textarea
                placeholder="Add any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="border-2 focus:border-primary resize-none"
              />
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 pt-2"
            >
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className={cn(
                  "w-full h-14 text-lg font-semibold rounded-xl shadow-lg",
                  type === "expense" 
                    ? "bg-rose-500 hover:bg-rose-600" 
                    : "bg-emerald-500 hover:bg-emerald-600"
                )}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {editingTransaction ? "Update" : "Add"} Transaction
              </Button>
              <DrawerClose asChild>
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl border-2 font-medium"
                >
                  Cancel
                </Button>
              </DrawerClose>
            </motion.div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
