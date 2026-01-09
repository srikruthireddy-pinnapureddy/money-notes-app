import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  PiggyBank, 
  Plus, 
  Pencil, 
  Trash2,
  AlertTriangle 
} from "lucide-react";
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

type Budget = {
  id: string;
  category: string;
  monthly_limit: number;
  alert_threshold: number;
  is_active: boolean;
};

interface BudgetSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMON_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Travel",
  "Education",
  "Other",
];

export function BudgetSettings({ open, onOpenChange }: BudgetSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [category, setCategory] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBudgets();
    }
  }, [open]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch budgets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategory("");
    setMonthlyLimit("");
    setAlertThreshold(80);
    setEditBudget(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setEditBudget(budget);
    setCategory(budget.category);
    setMonthlyLimit(budget.monthly_limit.toString());
    setAlertThreshold(budget.alert_threshold * 100);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!category.trim() || !monthlyLimit) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const budgetData = {
        user_id: user.id,
        category: category.trim(),
        monthly_limit: parseFloat(monthlyLimit),
        alert_threshold: alertThreshold / 100,
        is_active: true,
      };

      if (editBudget) {
        const { error } = await supabase
          .from("budgets")
          .update(budgetData)
          .eq("id", editBudget.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("budgets")
          .insert(budgetData);

        if (error) {
          if (error.code === "23505") {
            throw new Error("A budget for this category already exists");
          }
          throw error;
        }
      }

      toast({
        title: editBudget ? "Budget updated" : "Budget created",
        description: `Budget for "${category}" has been saved`,
      });

      setDialogOpen(false);
      resetForm();
      fetchBudgets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save budget",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (budget: Budget) => {
    try {
      const { error } = await supabase
        .from("budgets")
        .update({ is_active: !budget.is_active })
        .eq("id", budget.id);

      if (error) throw error;

      setBudgets(budgets.map(b => 
        b.id === budget.id ? { ...b, is_active: !b.is_active } : b
      ));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update budget",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setBudgets(budgets.filter(b => b.id !== deleteId));
      toast({
        title: "Budget deleted",
        description: "The budget has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete budget",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Budget Settings
            </DialogTitle>
            <DialogDescription>
              Set monthly spending limits and get alerts when you're close to exceeding them
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.length === 0 ? (
                  <div className="text-center py-6">
                    <PiggyBank className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No budgets set up yet
                    </p>
                    <Button onClick={openAddDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Budget
                    </Button>
                  </div>
                ) : (
                  <>
                    {budgets.map((budget) => (
                      <Card key={budget.id} className={`p-3 ${!budget.is_active ? "opacity-60" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{budget.category}</p>
                            <p className="text-xs text-muted-foreground">
                              ${budget.monthly_limit.toFixed(2)}/month • Alert at {(budget.alert_threshold * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={budget.is_active}
                              onCheckedChange={() => handleToggleActive(budget)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(budget)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteId(budget.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={openAddDialog}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Budget
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Budget Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editBudget ? "Edit Budget" : "Add Budget"}
            </DialogTitle>
            <DialogDescription>
              Set a monthly spending limit for a category
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input
                placeholder="e.g., Food & Dining"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="categories"
              />
              <datalist id="categories">
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Monthly Limit ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Alert Threshold</Label>
                <span className="text-sm text-muted-foreground">
                  {alertThreshold}%
                </span>
              </div>
              <Slider
                value={[alertThreshold]}
                onValueChange={([value]) => setAlertThreshold(value)}
                min={50}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                You'll be alerted when spending reaches {alertThreshold}% of the limit
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editBudget ? "Save Changes" : "Add Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the budget and stop all related alerts.
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
    </>
  );
}
