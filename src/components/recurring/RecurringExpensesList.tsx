import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Repeat, 
  Pencil, 
  Trash2, 
  Loader2,
  Calendar,
  Users,
  Play
} from "lucide-react";
import { RecurringExpenseDialog } from "./RecurringExpenseDialog";
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
  currency: string;
  frequency: string;
  next_occurrence: string;
  is_active: boolean;
  created_by: string;
  split_config: { user_id: string; share: number }[];
};

interface RecurringExpensesListProps {
  groupId: string;
  groupCurrency: string;
  members: Member[];
  currentUserId: string;
}

export function RecurringExpensesList({
  groupId,
  groupCurrency,
  members,
  currentUserId,
}: RecurringExpensesListProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<RecurringExpense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecurringExpenses();
  }, [groupId]);

  const fetchRecurringExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("group_id", groupId)
        .order("next_occurrence", { ascending: true });

      if (error) throw error;
      
      // Parse split_config from JSON
      const parsedData = (data || []).map(expense => ({
        ...expense,
        split_config: Array.isArray(expense.split_config) 
          ? expense.split_config as { user_id: string; share: number }[]
          : []
      }));
      
      setExpenses(parsedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch recurring expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (expense: RecurringExpense) => {
    try {
      const { error } = await supabase
        .from("recurring_expenses")
        .update({ is_active: !expense.is_active })
        .eq("id", expense.id);

      if (error) throw error;

      setExpenses(expenses.map(e => 
        e.id === expense.id ? { ...e, is_active: !e.is_active } : e
      ));

      toast({
        title: expense.is_active ? "Paused" : "Activated",
        description: `Recurring expense "${expense.description}" has been ${expense.is_active ? "paused" : "activated"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setExpenses(expenses.filter(e => e.id !== deleteId));
      toast({
        title: "Deleted",
        description: "Recurring expense has been deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    };
    return labels[frequency] || frequency;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleProcessNow = async () => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke("process-recurring-expenses", {
        method: "POST",
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Processing Complete",
          description: data.message || "Recurring expenses have been processed",
        });
        // Refresh the list to show updated next_occurrence dates
        fetchRecurringExpenses();
      } else {
        throw new Error(data?.error || "Processing failed");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process recurring expenses",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Recurring Expenses
          </h2>
          <div className="flex gap-2">
            {expenses.length > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleProcessNow}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Process Now
              </Button>
            )}
            <Button size="sm" onClick={() => {
              setEditExpense(null);
              setDialogOpen(true);
            }}>
              + Add
            </Button>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-6">
            <Repeat className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recurring expenses set up yet
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setEditExpense(null);
                setDialogOpen(true);
              }}
            >
              Create your first recurring expense
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const isCreator = expense.created_by === currentUserId;
              const splitCount = expense.split_config?.length || 0;

              return (
                <Card 
                  key={expense.id} 
                  className={`p-3 ${!expense.is_active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {expense.description}
                        </p>
                        <Badge variant={expense.is_active ? "default" : "secondary"} className="text-xs">
                          {getFrequencyLabel(expense.frequency)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Next: {formatDate(expense.next_occurrence)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {splitCount} members
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">
                        {groupCurrency} {Number(expense.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {isCreator && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={expense.is_active}
                          onCheckedChange={() => handleToggleActive(expense)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {expense.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditExpense(expense);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <RecurringExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groupId={groupId}
        groupCurrency={groupCurrency}
        members={members}
        editExpense={editExpense}
        onSaved={fetchRecurringExpenses}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all future automated expense creation. This action cannot be undone.
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
