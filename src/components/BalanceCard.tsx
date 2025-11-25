import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BalanceCardProps {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}

export const BalanceCard = ({ balance, totalIncome, totalExpenses }: BalanceCardProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Current Balance</span>
            <DollarSign className="h-5 w-5 opacity-90" />
          </div>
          <div className="text-3xl font-bold tracking-tight">
            ${balance.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-success-light bg-success-light/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Income</span>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-success">
            +${totalIncome.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-destructive-light bg-destructive-light/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-destructive">
            -${totalExpenses.toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
