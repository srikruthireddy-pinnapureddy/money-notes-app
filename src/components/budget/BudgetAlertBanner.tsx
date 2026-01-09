import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, X, PiggyBank } from "lucide-react";
import { BudgetSettings } from "./BudgetSettings";

type BudgetAlert = {
  category: string;
  monthly_limit: number;
  spent: number;
  percentage: number;
  exceeded: boolean;
};

export function BudgetAlertBanner() {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    checkBudgets();
  }, []);

  const checkBudgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active budgets
      const { data: budgets, error: budgetsError } = await supabase
        .from("budgets")
        .select("*")
        .eq("is_active", true);

      if (budgetsError) throw budgetsError;
      if (!budgets || budgets.length === 0) return;

      // Get current month's date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Fetch this month's personal transactions
      const { data: transactions, error: txError } = await supabase
        .from("personal_transactions")
        .select("amount, category")
        .eq("type", "expense")
        .gte("transaction_date", startOfMonth)
        .lte("transaction_date", endOfMonth);

      if (txError) throw txError;

      // Calculate spending by category
      const spendingByCategory: Record<string, number> = {};
      (transactions || []).forEach((tx) => {
        const cat = tx.category || "Other";
        spendingByCategory[cat] = (spendingByCategory[cat] || 0) + Number(tx.amount);
      });

      // Check each budget
      const alertList: BudgetAlert[] = [];
      budgets.forEach((budget) => {
        const spent = spendingByCategory[budget.category] || 0;
        const percentage = (spent / budget.monthly_limit) * 100;
        
        if (percentage >= budget.alert_threshold * 100) {
          alertList.push({
            category: budget.category,
            monthly_limit: budget.monthly_limit,
            spent,
            percentage,
            exceeded: percentage >= 100,
          });
        }
      });

      setAlerts(alertList);
    } catch (error) {
      console.error("Error checking budgets:", error);
    }
  };

  const dismissAlert = (category: string) => {
    setDismissed(new Set([...dismissed, category]));
  };

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.category));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-2 mb-4">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.category}
            className={`rounded-lg p-3 flex items-start gap-3 ${
              alert.exceeded
                ? "bg-destructive/10 border border-destructive/30"
                : "bg-yellow-500/10 border border-yellow-500/30"
            }`}
          >
            <AlertTriangle 
              className={`h-5 w-5 mt-0.5 shrink-0 ${
                alert.exceeded ? "text-destructive" : "text-yellow-600"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm font-medium ${
                  alert.exceeded ? "text-destructive" : "text-yellow-700 dark:text-yellow-400"
                }`}>
                  {alert.exceeded ? "Budget Exceeded" : "Approaching Budget Limit"}: {alert.category}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1"
                  onClick={() => dismissAlert(alert.category)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Progress 
                  value={Math.min(alert.percentage, 100)} 
                  className={`h-2 flex-1 ${
                    alert.exceeded ? "[&>div]:bg-destructive" : "[&>div]:bg-yellow-500"
                  }`}
                />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {alert.percentage.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ${alert.spent.toFixed(2)} of ${alert.monthly_limit.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => setSettingsOpen(true)}
        >
          <PiggyBank className="h-3 w-3 mr-1" />
          Manage Budgets
        </Button>
      </div>

      <BudgetSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
