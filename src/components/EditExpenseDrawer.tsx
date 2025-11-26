import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

type Member = {
  id: string;
  user_id: string;
  profiles: {
    display_name: string;
  };
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_splits: Array<{
    user_id: string;
    amount: number;
  }>;
};

type SplitType = "equal" | "exact" | "percentage" | "shares";

type CustomSplit = {
  [userId: string]: number;
};

interface EditExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  groupCurrency: string;
  members: Member[];
  onExpenseUpdated: () => void;
}

export function EditExpenseDrawer({
  open,
  onOpenChange,
  expense,
  groupCurrency,
  members,
  onExpenseUpdated,
}: EditExpenseDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [customSplits, setCustomSplits] = useState<CustomSplit>({});

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategory(expense.category || "");
      
      const memberIds = expense.expense_splits.map(s => s.user_id);
      setSelectedMembers(new Set(memberIds));
      
      // Determine split type
      const splits = expense.expense_splits;
      const equalAmount = expense.amount / splits.length;
      const isEqual = splits.every(s => Math.abs(s.amount - equalAmount) < 0.01);
      
      if (isEqual) {
        setSplitType("equal");
        setCustomSplits({});
      } else {
        setSplitType("exact");
        const newCustomSplits: CustomSplit = {};
        splits.forEach(s => {
          newCustomSplits[s.user_id] = s.amount;
        });
        setCustomSplits(newCustomSplits);
      }
    }
  }, [expense]);

  const calculateSplitAmounts = (): { userId: string; amount: number }[] => {
    const totalAmount = parseFloat(amount);
    
    if (splitType === "equal") {
      const splitAmount = totalAmount / selectedMembers.size;
      return Array.from(selectedMembers).map((userId) => ({
        userId,
        amount: Math.round(splitAmount * 100) / 100,
      }));
    }
    
    if (splitType === "exact") {
      return Array.from(selectedMembers).map((userId) => ({
        userId,
        amount: customSplits[userId] || 0,
      }));
    }
    
    if (splitType === "percentage") {
      return Array.from(selectedMembers).map((userId) => ({
        userId,
        amount: Math.round((totalAmount * (customSplits[userId] || 0) / 100) * 100) / 100,
      }));
    }
    
    if (splitType === "shares") {
      const totalShares = Array.from(selectedMembers).reduce(
        (sum, userId) => sum + (customSplits[userId] || 0),
        0
      );
      return Array.from(selectedMembers).map((userId) => ({
        userId,
        amount: totalShares > 0 
          ? Math.round((totalAmount * (customSplits[userId] || 0) / totalShares) * 100) / 100
          : 0,
      }));
    }
    
    return [];
  };

  const validateCustomSplits = (): boolean => {
    if (splitType === "equal") return true;
    
    const totalAmount = parseFloat(amount);
    const splits = calculateSplitAmounts();
    const total = splits.reduce((sum, split) => sum + split.amount, 0);
    
    if (splitType === "exact") {
      if (Math.abs(total - totalAmount) > 0.01) {
        toast({
          title: "Invalid split",
          description: `Split amounts must total ${groupCurrency} ${totalAmount.toFixed(2)}`,
          variant: "destructive",
        });
        return false;
      }
    }
    
    if (splitType === "percentage") {
      const totalPercentage = Array.from(selectedMembers).reduce(
        (sum, userId) => sum + (customSplits[userId] || 0),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast({
          title: "Invalid split",
          description: `Percentages must total 100%`,
          variant: "destructive",
        });
        return false;
      }
    }
    
    if (splitType === "shares") {
      const totalShares = Array.from(selectedMembers).reduce(
        (sum, userId) => sum + (customSplits[userId] || 0),
        0
      );
      if (totalShares === 0) {
        toast({
          title: "Invalid split",
          description: "Total shares must be greater than 0",
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!expense) return;

    // Validate inputs
    const descriptionSchema = z.string().trim().min(1).max(200);
    const amountSchema = z.number().positive().max(999999999);
    
    try {
      descriptionSchema.parse(description);
      amountSchema.parse(parseFloat(amount));
    } catch (error) {
      toast({
        title: "Invalid input",
        description: "Please check your description and amount",
        variant: "destructive",
      });
      return;
    }

    if (selectedMembers.size === 0) {
      toast({
        title: "Missing information",
        description: "Please select at least one member",
        variant: "destructive",
      });
      return;
    }

    if (!validateCustomSplits()) {
      return;
    }

    try {
      setLoading(true);

      // Update expense
      const { error: expenseError } = await supabase
        .from("expenses")
        .update({
          description: description.trim(),
          amount: parseFloat(amount),
          category: category.trim() || null,
        })
        .eq("id", expense.id);

      if (expenseError) throw expenseError;

      // Delete old splits
      const { error: deleteError } = await supabase
        .from("expense_splits")
        .delete()
        .eq("expense_id", expense.id);

      if (deleteError) throw deleteError;

      // Create new splits
      const splits = calculateSplitAmounts().map((split) => ({
        expense_id: expense.id,
        user_id: split.userId,
        amount: split.amount,
      }));

      const { error: splitsError } = await supabase
        .from("expense_splits")
        .insert(splits);

      if (splitsError) throw splitsError;

      toast({
        title: "Expense updated",
        description: "Your changes have been saved",
      });

      onOpenChange(false);
      onExpenseUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
      const newCustomSplits = { ...customSplits };
      delete newCustomSplits[userId];
      setCustomSplits(newCustomSplits);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const selectAll = () => {
    setSelectedMembers(new Set(members.map((m) => m.user_id)));
  };

  const updateCustomSplit = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomSplits({
      ...customSplits,
      [userId]: numValue,
    });
  };

  const getCalculatedAmount = (userId: string): string => {
    if (!amount || splitType === "equal") {
      return selectedMembers.size > 0 
        ? (parseFloat(amount || "0") / selectedMembers.size).toFixed(2)
        : "0.00";
    }
    
    const splits = calculateSplitAmounts();
    const split = splits.find(s => s.userId === userId);
    return split ? split.amount.toFixed(2) : "0.00";
  };

  if (!expense) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Expense</DrawerTitle>
          <DrawerDescription>
            Update expense details and split
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto space-y-6 pb-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-base">
              Description *
            </Label>
            <Input
              id="edit-description"
              placeholder="e.g., Dinner at restaurant"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="edit-amount" className="text-base">
              Amount ({groupCurrency}) *
            </Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="edit-category" className="text-base">
              Category (optional)
            </Label>
            <Input
              id="edit-category"
              placeholder="e.g., Food, Transport, Accommodation"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Split with members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Split with *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-sm"
              >
                Select All
              </Button>
            </div>
            
            <div className="space-y-3 border rounded-lg p-4 max-h-48 overflow-y-auto">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`edit-${member.user_id}`}
                    checked={selectedMembers.has(member.user_id)}
                    onCheckedChange={() => toggleMember(member.user_id)}
                  />
                  <Label
                    htmlFor={`edit-${member.user_id}`}
                    className="text-base font-normal flex-1 cursor-pointer"
                  >
                    {member.profiles.display_name}
                  </Label>
                  {selectedMembers.has(member.user_id) && amount && (
                    <span className="text-sm text-muted-foreground">
                      {groupCurrency} {getCalculatedAmount(member.user_id)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Split Type Selection */}
          {selectedMembers.size > 0 && (
            <div className="space-y-3">
              <Label className="text-base">Split Method</Label>
              <Select value={splitType} onValueChange={(value) => setSplitType(value as SplitType)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal" className="text-base">
                    Split Equally
                  </SelectItem>
                  <SelectItem value="exact" className="text-base">
                    Exact Amounts
                  </SelectItem>
                  <SelectItem value="percentage" className="text-base">
                    By Percentage
                  </SelectItem>
                  <SelectItem value="shares" className="text-base">
                    By Shares
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Split Inputs */}
              {splitType !== "equal" && (
                <div className="space-y-3 border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {Array.from(selectedMembers).map((userId) => {
                    const member = members.find(m => m.user_id === userId);
                    if (!member) return null;
                    
                    return (
                      <div key={userId} className="space-y-2">
                        <Label className="text-sm">
                          {member.profiles.display_name}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={splitType === "exact" ? "Amount" : splitType === "percentage" ? "%" : "Shares"}
                            value={customSplits[userId] || ""}
                            onChange={(e) => updateCustomSplit(userId, e.target.value)}
                            className="h-10 text-base"
                          />
                          <span className="text-sm text-muted-foreground shrink-0">
                            = {groupCurrency} {getCalculatedAmount(userId)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {splitType === "equal" && (
                <p className="text-sm text-muted-foreground">
                  Split equally between {selectedMembers.size} member{selectedMembers.size !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="safe-bottom">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            size="lg"
            className="h-14 text-base"
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Save Changes
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" size="lg" className="h-14 text-base">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
