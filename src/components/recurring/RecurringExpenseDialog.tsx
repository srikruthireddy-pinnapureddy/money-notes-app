import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Repeat } from "lucide-react";
import { recurringExpenseSchema, MAX_LENGTHS } from "@/utils/validation";

type Member = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

type RecurringExpense = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  frequency: string;
  next_occurrence: string;
  is_active: boolean;
  split_config: { user_id: string; share: number }[];
};

interface RecurringExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupCurrency: string;
  members: Member[];
  editExpense?: RecurringExpense | null;
  onSaved: () => void;
}

export function RecurringExpenseDialog({
  open,
  onOpenChange,
  groupId,
  groupCurrency,
  members,
  editExpense,
  onSaved,
}: RecurringExpenseDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [nextOccurrence, setNextOccurrence] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (editExpense) {
      setDescription(editExpense.description);
      setAmount(editExpense.amount.toString());
      setCategory(editExpense.category || "");
      setFrequency(editExpense.frequency);
      setNextOccurrence(editExpense.next_occurrence);
      const memberIds = editExpense.split_config?.map((s) => s.user_id) || [];
      setSelectedMembers(new Set(memberIds));
    } else {
      resetForm();
    }
  }, [editExpense, open]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("");
    setFrequency("monthly");
    setNextOccurrence(new Date().toISOString().split("T")[0]);
    setSelectedMembers(new Set());
    setErrors({});
  };

  const validateForm = (): boolean => {
    const parsedAmount = parseFloat(amount);
    const result = recurringExpenseSchema.safeParse({
      description: description.trim(),
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      category: category.trim() || null,
      frequency,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        newErrors[field] = err.message;
      });
      setErrors(newErrors);
      return false;
    }

    if (selectedMembers.size === 0) {
      setErrors({ members: "Please select at least one member" });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const splitConfig = Array.from(selectedMembers).map((userId) => ({
        user_id: userId,
        share: 1, // Equal shares by default
      }));

      const expenseData = {
        group_id: groupId,
        created_by: user.id,
        description: description.trim(),
        amount: parseFloat(amount),
        category: category.trim() || null,
        currency: groupCurrency,
        frequency,
        next_occurrence: nextOccurrence,
        split_config: splitConfig,
        is_active: true,
      };

      if (editExpense) {
        const { error } = await supabase
          .from("recurring_expenses")
          .update(expenseData)
          .eq("id", editExpense.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recurring_expenses")
          .insert(expenseData);

        if (error) throw error;
      }

      toast({
        title: editExpense ? "Recurring expense updated" : "Recurring expense created",
        description: `This expense will be created ${frequency}`,
      });

      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save recurring expense",
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
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const selectAll = () => {
    setSelectedMembers(new Set(members.map((m) => m.user_id)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            {editExpense ? "Edit Recurring Expense" : "Create Recurring Expense"}
          </DialogTitle>
          <DialogDescription>
            Set up an expense that repeats automatically
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="e.g., Monthly rent"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
              }}
              maxLength={MAX_LENGTHS.recurringExpenseDescription}
              className={errors.description ? "border-destructive" : ""}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {errors.description ? (
                <span className="text-destructive">{errors.description}</span>
              ) : (
                <span />
              )}
              <span>{description.length}/{MAX_LENGTHS.recurringExpenseDescription}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({groupCurrency}) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
              }}
              className={errors.amount ? "border-destructive" : ""}
            />
            {errors.amount && (
              <span className="text-xs text-destructive">{errors.amount}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g., Rent, Utilities"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
              }}
              maxLength={MAX_LENGTHS.recurringExpenseCategory}
              className={errors.category ? "border-destructive" : ""}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {errors.category ? (
                <span className="text-destructive">{errors.category}</span>
              ) : (
                <span />
              )}
              <span>{category.length}/{MAX_LENGTHS.recurringExpenseCategory}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Frequency *</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextOccurrence" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Next Occurrence *
            </Label>
            <Input
              id="nextOccurrence"
              type="date"
              value={nextOccurrence}
              onChange={(e) => setNextOccurrence(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Split with *</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
            </div>
            <div className={`space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto ${errors.members ? "border-destructive" : ""}`}>
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${member.user_id}`}
                    checked={selectedMembers.has(member.user_id)}
                    onCheckedChange={() => {
                      toggleMember(member.user_id);
                      if (errors.members) setErrors((prev) => ({ ...prev, members: "" }));
                    }}
                  />
                  <Label
                    htmlFor={`member-${member.user_id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {member.display_name}
                  </Label>
                </div>
              ))}
            </div>
            {errors.members && (
              <span className="text-xs text-destructive">{errors.members}</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editExpense ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
