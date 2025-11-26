import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type Member = {
  id: string;
  user_id: string;
  profiles: {
    display_name: string;
  };
};

interface AddExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupCurrency: string;
  members: Member[];
  onExpenseAdded: () => void;
}

export function AddExpenseDrawer({
  open,
  onOpenChange,
  groupId,
  groupCurrency,
  members,
  onExpenseAdded,
}: AddExpenseDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const handleSubmit = async () => {
    if (!description.trim() || !amount || selectedMembers.size === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select at least one member",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create expense
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          group_id: groupId,
          description: description.trim(),
          amount: parseFloat(amount),
          currency: groupCurrency,
          category: category.trim() || null,
          paid_by: user.id,
          expense_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create expense splits
      const splitAmount = parseFloat(amount) / selectedMembers.size;
      const splits = Array.from(selectedMembers).map((userId) => ({
        expense_id: expense.id,
        user_id: userId,
        amount: splitAmount,
      }));

      const { error: splitsError } = await supabase
        .from("expense_splits")
        .insert(splits);

      if (splitsError) throw splitsError;

      toast({
        title: "Expense added",
        description: "Your expense has been successfully recorded",
      });

      // Reset form
      setDescription("");
      setAmount("");
      setCategory("");
      setSelectedMembers(new Set());
      onOpenChange(false);
      onExpenseAdded();
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Add Expense</DrawerTitle>
          <DrawerDescription>
            Record a new expense for this group
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto space-y-6 pb-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base">
              Description *
            </Label>
            <Input
              id="description"
              placeholder="e.g., Dinner at restaurant"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-base">
              Amount ({groupCurrency}) *
            </Label>
            <Input
              id="amount"
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
            <Label htmlFor="category" className="text-base">
              Category (optional)
            </Label>
            <Input
              id="category"
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
                    id={member.user_id}
                    checked={selectedMembers.has(member.user_id)}
                    onCheckedChange={() => toggleMember(member.user_id)}
                  />
                  <Label
                    htmlFor={member.user_id}
                    className="text-base font-normal flex-1 cursor-pointer"
                  >
                    {member.profiles.display_name}
                  </Label>
                  {selectedMembers.has(member.user_id) && amount && (
                    <span className="text-sm text-muted-foreground">
                      {groupCurrency} {(parseFloat(amount) / selectedMembers.size).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {selectedMembers.size > 0 && (
              <p className="text-sm text-muted-foreground">
                Split equally between {selectedMembers.size} member{selectedMembers.size !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <DrawerFooter className="safe-bottom">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            size="lg"
            className="h-14 text-base"
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Add Expense
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
