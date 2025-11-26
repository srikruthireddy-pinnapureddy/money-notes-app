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
import { Loader2, Camera } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
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

interface AddExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupCurrency: string;
  members: Member[];
  onExpenseAdded: () => void;
}

type SplitType = "equal" | "exact" | "percentage" | "shares";

type CustomSplit = {
  [userId: string]: number;
};

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
  const [scanning, setScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [customSplits, setCustomSplits] = useState<CustomSplit>({});

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
          description: `Split amounts must total ${groupCurrency} ${totalAmount.toFixed(2)}. Current: ${groupCurrency} ${total.toFixed(2)}`,
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
          description: `Percentages must total 100%. Current: ${totalPercentage.toFixed(1)}%`,
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
        title: "Expense added",
        description: "Your expense has been successfully recorded",
      });

      // Reset form
      setDescription("");
      setAmount("");
      setCategory("");
      setSelectedMembers(new Set());
      setSplitType("equal");
      setCustomSplits({});
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
      // Remove custom split for unselected member
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

  const handleScanReceipt = async (imageData: string) => {
    try {
      setScanning(true);
      setShowCamera(false);

      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { image: imageData },
      });

      if (error) throw error;

      if (data) {
        setDescription(data.description || "");
        setAmount(data.amount?.toString() || "");
        setCategory(data.category || "");
        
        toast({
          title: "Receipt scanned!",
          description: "Expense details have been filled automatically",
        });
      }
    } catch (error: any) {
      console.error("Error scanning receipt:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Could not scan receipt. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleScanReceipt}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

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
          {/* AI Receipt Scanner Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 text-base"
            onClick={() => setShowCamera(true)}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Scan Receipt with AI
              </>
            )}
          </Button>
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
