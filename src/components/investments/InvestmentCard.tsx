import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type Investment = {
  id: string;
  name: string;
  type: string;
  symbol: string | null;
  units: number;
  invested_amount: number;
  current_value: number;
  purchase_date: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type InvestmentCardProps = {
  investment: Investment;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
};

const typeColors: Record<string, { bg: string; text: string }> = {
  sip: { bg: "bg-blue-500/10", text: "text-blue-500" },
  etf: { bg: "bg-purple-500/10", text: "text-purple-500" },
  stock: { bg: "bg-amber-500/10", text: "text-amber-500" },
  mutual_fund: { bg: "bg-cyan-500/10", text: "text-cyan-500" },
  other: { bg: "bg-muted", text: "text-muted-foreground" },
};

const typeLabels: Record<string, string> = {
  sip: "SIP",
  etf: "ETF",
  stock: "Stock",
  mutual_fund: "Mutual Fund",
  other: "Other",
};

export function InvestmentCard({ investment, onEdit, onDelete, onClick }: InvestmentCardProps) {
  const returns = investment.current_value - investment.invested_amount;
  const returnsPercent = investment.invested_amount > 0 
    ? ((returns / investment.invested_amount) * 100) 
    : 0;
  const isPositive = returns >= 0;
  
  const colors = typeColors[investment.type] || typeColors.other;

  return (
    <div 
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card border cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onClick}
    >
      {/* Left: Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-medium text-sm truncate">{investment.name}</h4>
          <Badge variant="secondary" className={`${colors.bg} ${colors.text} border-0 text-xs px-1.5 py-0`}>
            {typeLabels[investment.type] || investment.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>₹{investment.invested_amount.toLocaleString()}</span>
          <span>→</span>
          <span className="font-medium text-foreground">₹{investment.current_value.toLocaleString()}</span>
        </div>
      </div>

      {/* Right: Returns + Menu */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        }`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{isPositive ? "+" : ""}{returnsPercent.toFixed(1)}%</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
