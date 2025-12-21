import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2, TrendingUp, BarChart3, Layers, PieChart, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Investment } from "./InvestmentCard";
import { investmentSchema, MAX_LENGTHS } from "@/utils/validation";

type AddInvestmentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvestmentAdded: () => void;
  editingInvestment: Investment | null;
};

const investmentTypes = [
  { value: "sip", label: "SIP", icon: TrendingUp },
  { value: "etf", label: "ETF", icon: BarChart3 },
  { value: "stock", label: "Stock", icon: Layers },
  { value: "mutual_fund", label: "Mutual Fund", icon: PieChart },
  { value: "other", label: "Other", icon: HelpCircle },
];

export function AddInvestmentDrawer({
  open,
  onOpenChange,
  onInvestmentAdded,
  editingInvestment,
}: AddInvestmentDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("sip");
  const [symbol, setSymbol] = useState("");
  const [units, setUnits] = useState("");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingInvestment) {
      setName(editingInvestment.name);
      setType(editingInvestment.type);
      setSymbol(editingInvestment.symbol || "");
      setUnits(editingInvestment.units.toString());
      setInvestedAmount(editingInvestment.invested_amount.toString());
      setCurrentValue(editingInvestment.current_value.toString());
      setPurchaseDate(new Date(editingInvestment.purchase_date));
      setNotes(editingInvestment.notes || "");
    } else {
      resetForm();
    }
  }, [editingInvestment, open]);

  const resetForm = () => {
    setName("");
    setType("sip");
    setSymbol("");
    setUnits("");
    setInvestedAmount("");
    setCurrentValue("");
    setPurchaseDate(new Date());
    setNotes("");
  };

  const handleSubmit = async () => {
    // Validate inputs using schema
    const validation = investmentSchema.safeParse({
      name: name.trim(),
      type,
      symbol: symbol.trim() || null,
      notes: notes.trim() || null,
      units: parseFloat(units) || 0,
      investedAmount: parseFloat(investedAmount) || 0,
      currentValue: parseFloat(currentValue) || parseFloat(investedAmount) || 0,
    });
    
    if (!validation.success) {
      toast({
        title: "Invalid input",
        description: validation.error.errors[0]?.message || "Please check your inputs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const investmentData = {
        user_id: user.id,
        name: name.trim(),
        type,
        symbol: symbol.trim() || null,
        units: parseFloat(units) || 0,
        invested_amount: parseFloat(investedAmount),
        current_value: parseFloat(currentValue) || parseFloat(investedAmount),
        purchase_date: format(purchaseDate, "yyyy-MM-dd"),
        notes: notes.trim() || null,
      };

      if (editingInvestment) {
        const { error } = await supabase
          .from("investments")
          .update(investmentData)
          .eq("id", editingInvestment.id);
        if (error) throw error;
        toast({ title: "Investment updated!" });
      } else {
        const { error } = await supabase
          .from("investments")
          .insert([investmentData]);
        if (error) throw error;
        toast({ title: "Investment added!" });
      }

      onInvestmentAdded();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {editingInvestment ? "Edit Investment" : "Add Investment"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-6 overflow-y-auto">
          {/* Investment Type */}
          <div className="space-y-2">
            <Label>Investment Type</Label>
            <div className="grid grid-cols-5 gap-2">
              {investmentTypes.map((t) => {
                const Icon = t.icon;
                return (
                  <motion.button
                    key={t.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
                      type === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 hover:bg-muted border-border"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Name and Symbol */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">Name *</Label>
                <span className={`text-xs ${name.length > MAX_LENGTHS.investmentName ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {name.length}/{MAX_LENGTHS.investmentName}
                </span>
              </div>
              <Input
                id="name"
                placeholder="e.g., Axis Bluechip Fund"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_LENGTHS.investmentName))}
                maxLength={MAX_LENGTHS.investmentName}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="symbol">Symbol</Label>
                <span className={`text-xs ${symbol.length > MAX_LENGTHS.investmentSymbol ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {symbol.length}/{MAX_LENGTHS.investmentSymbol}
                </span>
              </div>
              <Input
                id="symbol"
                placeholder="e.g., AXISBLU"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, MAX_LENGTHS.investmentSymbol))}
                maxLength={MAX_LENGTHS.investmentSymbol}
              />
            </div>
          </div>

          {/* Units */}
          <div className="space-y-2">
            <Label htmlFor="units">Units/Quantity</Label>
            <Input
              id="units"
              type="number"
              placeholder="Number of units"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </div>

          {/* Invested Amount & Current Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="invested">Invested Amount *</Label>
              <Input
                id="invested"
                type="number"
                placeholder="₹0"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current">Current Value</Label>
              <Input
                id="current"
                type="number"
                placeholder="₹0"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
              />
            </div>
          </div>

          {/* Purchase Date */}
          <div className="space-y-2">
            <Label>Purchase/Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(purchaseDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={(d) => d && setPurchaseDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Notes</Label>
              <span className={`text-xs ${notes.length > MAX_LENGTHS.investmentNotes ? 'text-destructive' : 'text-muted-foreground'}`}>
                {notes.length}/{MAX_LENGTHS.investmentNotes}
              </span>
            </div>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_LENGTHS.investmentNotes))}
              rows={2}
              maxLength={MAX_LENGTHS.investmentNotes}
            />
          </div>

          {/* Returns Preview */}
          <AnimatePresence>
            {investedAmount && currentValue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expected Returns</span>
                  {(() => {
                    const invested = parseFloat(investedAmount) || 0;
                    const current = parseFloat(currentValue) || 0;
                    const returns = current - invested;
                    const percent = invested > 0 ? ((returns / invested) * 100) : 0;
                    const isPositive = returns >= 0;
                    return (
                      <div className={`flex items-center gap-2 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                        <span className="font-semibold">
                          {isPositive ? "+" : ""}₹{Math.abs(returns).toLocaleString()}
                        </span>
                        <span className="text-sm">
                          ({isPositive ? "+" : ""}{percent.toFixed(2)}%)
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : editingInvestment ? (
              "Update Investment"
            ) : (
              "Add Investment"
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
