import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = {
  user_id: string;
  display_name: string;
};

interface ExpenseAttachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupCurrency: string;
  members: Member[];
  currentUserId: string;
  suggestedAmount?: string;
  suggestedDescription?: string;
  onExpenseAdded: () => void;
}

const CATEGORIES = [
  "Food & Drinks",
  "Transportation",
  "Accommodation",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Other"
];

export function ExpenseAttachDialog({
  open,
  onOpenChange,
  groupId,
  groupCurrency,
  members,
  currentUserId,
  suggestedAmount,
  suggestedDescription,
  onExpenseAdded,
}: ExpenseAttachDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(suggestedDescription || "");
  const [amount, setAmount] = useState(suggestedAmount || "");
  const [category, setCategory] = useState<string>("");
  const [splitType, setSplitType] = useState<"equal" | "payer">("equal");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid description and amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const amountNum = parseFloat(amount);
      const today = new Date().toISOString().split("T")[0];

      // Insert expense
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          group_id: groupId,
          description: description.trim(),
          amount: amountNum,
          currency: groupCurrency,
          paid_by: currentUserId,
          expense_date: today,
          category: category || null,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create splits
      const splits = splitType === "equal"
        ? members.map(m => ({
            expense_id: expense.id,
            user_id: m.user_id,
            amount: amountNum / members.length,
          }))
        : [{
            expense_id: expense.id,
            user_id: currentUserId,
            amount: amountNum,
          }];

      const { error: splitsError } = await supabase
        .from("expense_splits")
        .insert(splits);

      if (splitsError) throw splitsError;

      // Send a message in chat about the expense
      await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: currentUserId,
        content: `💰 Added expense: ${description.trim()} - ${groupCurrency} ${amountNum.toFixed(2)}`,
      });

      toast({ title: "Expense added successfully" });
      onExpenseAdded();
      
      // Reset form
      setDescription("");
      setAmount("");
      setCategory("");
      setSplitType("equal");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update state when suggestions change
  useState(() => {
    if (suggestedAmount) setAmount(suggestedAmount);
    if (suggestedDescription) setDescription(suggestedDescription);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Quick Add Expense
          </DialogTitle>
          <DialogDescription>
            Add an expense directly from the chat
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What was the expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({groupCurrency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Split</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={splitType === "equal" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitType("equal")}
                className="flex-1"
              >
                Split Equally
              </Button>
              <Button
                type="button"
                variant={splitType === "payer" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitType("payer")}
                className="flex-1"
              >
                Only Me
              </Button>
            </div>
            {splitType === "equal" && (
              <p className="text-xs text-muted-foreground mt-1">
                Split between {members.length} members ({groupCurrency} {amount ? (parseFloat(amount) / members.length).toFixed(2) : "0.00"} each)
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
