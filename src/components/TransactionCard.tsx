import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  MoreVertical, 
  Pencil, 
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Wallet
} from "lucide-react";
import { format } from "date-fns";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  notes: string | null;
  payment_mode: string | null;
  transaction_date: string;
};

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}

const paymentModeIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3 w-3" />,
  card: <CreditCard className="h-3 w-3" />,
  upi: <Smartphone className="h-3 w-3" />,
  bank_transfer: <Building2 className="h-3 w-3" />,
  wallet: <Wallet className="h-3 w-3" />,
  other: <Wallet className="h-3 w-3" />,
};

export function TransactionCard({ transaction, onEdit, onDelete }: TransactionCardProps) {
  const isIncome = transaction.type === "income";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            {isIncome ? (
              <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-rose-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {transaction.category || (isIncome ? "Income" : "Expense")}
            </p>
            {transaction.notes && (
              <p className="text-xs text-muted-foreground truncate">{transaction.notes}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {format(new Date(transaction.transaction_date), "MMM d, yyyy")}
              </span>
              {transaction.payment_mode && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {paymentModeIcons[transaction.payment_mode] || paymentModeIcons.other}
                  {transaction.payment_mode.replace("_", " ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isIncome ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}