import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2, ChevronRight } from "lucide-react";
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
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card 
        className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate">{investment.name}</h4>
              {investment.symbol && (
                <span className="text-xs text-muted-foreground">
                  ({investment.symbol})
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className={`${colors.bg} ${colors.text} border-0`}>
                {typeLabels[investment.type] || investment.type}
              </Badge>
              {investment.units > 0 && (
                <span className="text-xs text-muted-foreground">
                  {investment.units} units
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Invested</p>
                <p className="font-semibold">₹{investment.invested_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Current Value</p>
                <p className="font-semibold">₹{investment.current_value.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
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

            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            }`}>
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{isPositive ? "+" : ""}{returnsPercent.toFixed(2)}%</span>
            </div>
            
            <p className={`text-sm font-medium ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
              {isPositive ? "+" : ""}₹{Math.abs(returns).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
