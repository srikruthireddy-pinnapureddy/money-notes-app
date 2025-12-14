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
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card border hover:bg-accent/30 transition-colors">
      <div className={`p-1.5 rounded-full shrink-0 ${isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
        {isIncome ? (
          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
        ) : (
          <ArrowDownCircle className="h-4 w-4 text-rose-500" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">
            {transaction.category || (isIncome ? "Income" : "Expense")}
          </p>
          <span className={`font-semibold text-sm shrink-0 ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isIncome ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {format(new Date(transaction.transaction_date), "MMM d")}
          </span>
          {transaction.payment_mode && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              {paymentModeIcons[transaction.payment_mode] || paymentModeIcons.other}
            </span>
          )}
          {transaction.notes && (
            <span className="text-xs text-muted-foreground truncate">{transaction.notes}</span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreVertical className="h-3.5 w-3.5" />
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
  );
}