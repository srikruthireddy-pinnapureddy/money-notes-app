import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Landmark, Calendar, TrendingUp, Coins, BadgePercent, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function FDCalculator() {
  const [principal, setPrincipal] = useState(100000);
  const [interestRate, setInterestRate] = useState(7);
  const [tenure, setTenure] = useState(3);
  const [compoundingFrequency, setCompoundingFrequency] = useState<"monthly" | "quarterly" | "yearly">("quarterly");

  const calculations = useMemo(() => {
    const compoundingMap = {
      monthly: 12,
      quarterly: 4,
      yearly: 1,
    };
    const n = compoundingMap[compoundingFrequency];
    const r = interestRate / 100;
    const t = tenure;

    // FD Maturity Formula: A = P(1 + r/n)^(nt)
    const maturityAmount = principal * Math.pow(1 + r / n, n * t);
    const totalInterest = maturityAmount - principal;
    const effectiveReturn = (totalInterest / principal) * 100;

    // Simple interest comparison
    const simpleInterest = principal * r * t;
    const compoundBenefit = totalInterest - simpleInterest;

    // Yearly breakdown
    const yearlyBreakdown = [];
    for (let year = 1; year <= tenure; year++) {
      const valueAtYear = principal * Math.pow(1 + r / n, n * year);
      yearlyBreakdown.push({
        year,
        value: Math.round(valueAtYear),
        interest: Math.round(valueAtYear - principal),
      });
    }

    return {
      maturityAmount: Math.round(maturityAmount),
      totalInterest: Math.round(totalInterest),
      effectiveReturn: effectiveReturn.toFixed(1),
      compoundBenefit: Math.round(compoundBenefit),
      yearlyBreakdown,
    };
  }, [principal, interestRate, tenure, compoundingFrequency]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  // Calculate breakdown for visualization
  const principalPercent = (principal / calculations.maturityAmount) * 100;
  const interestPercent = (calculations.totalInterest / calculations.maturityAmount) * 100;

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-background to-blue-500/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5 text-blue-600" />
          FD Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Principal Amount */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm">Principal Amount</Label>
            <span className="font-semibold text-blue-600">
              {formatCurrency(principal)}
            </span>
          </div>
          <Slider
            value={[principal]}
            onValueChange={([v]) => setPrincipal(v)}
            min={10000}
            max={10000000}
            step={10000}
            className="py-2"
          />
          <Input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="text-right"
          />
        </div>

        {/* Interest Rate */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm">Interest Rate (p.a.)</Label>
            <span className="font-semibold">{interestRate}%</span>
          </div>
          <Slider
            value={[interestRate]}
            onValueChange={([v]) => setInterestRate(v)}
            min={4}
            max={9}
            step={0.1}
            className="py-2"
          />
        </div>

        {/* Tenure */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm">Tenure</Label>
            <span className="font-semibold">{tenure} years</span>
          </div>
          <Slider
            value={[tenure]}
            onValueChange={([v]) => setTenure(v)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
        </div>

        {/* Compounding Frequency */}
        <div className="space-y-2">
          <Label className="text-sm">Compounding</Label>
          <div className="flex gap-2">
            {(["monthly", "quarterly", "yearly"] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => setCompoundingFrequency(freq)}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  compoundingFrequency === freq
                    ? "bg-blue-600 text-white"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 pt-4 border-t">
          <motion.div
            key={calculations.maturityAmount}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Maturity Amount</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(calculations.maturityAmount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              After {tenure} year{tenure > 1 ? "s" : ""}
            </div>
          </motion.div>

          {/* Visual Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Principal vs Interest</span>
              <span>{principalPercent.toFixed(0)}% / {interestPercent.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-muted flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${principalPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-blue-600 h-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${interestPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                className="bg-emerald-500 h-full"
              />
            </div>
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-muted-foreground">Principal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Interest</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Principal
              </div>
              <div className="font-semibold">
                {formatCurrency(principal)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                Interest Earned
              </div>
              <div className="font-semibold text-emerald-600">
                {formatCurrency(calculations.totalInterest)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Return</span>
              </div>
              <span className="font-semibold text-emerald-600 text-sm">
                +{calculations.effectiveReturn}%
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Compound</span>
              </div>
              <span className="font-semibold text-blue-600 text-sm">
                +{formatCurrency(calculations.compoundBenefit)}
              </span>
            </div>
          </div>

          {/* Year-wise breakdown */}
          {tenure > 1 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Year-wise Growth</Label>
              <div className="flex gap-1">
                {calculations.yearlyBreakdown.map((item, idx) => (
                  <div
                    key={item.year}
                    className="flex-1 text-center"
                  >
                    <div
                      className="bg-blue-500/20 rounded-t-sm mx-auto mb-1"
                      style={{
                        width: "100%",
                        height: `${(item.value / calculations.maturityAmount) * 40}px`,
                        minHeight: "8px",
                      }}
                    />
                    <div className="text-[10px] text-muted-foreground">Y{item.year}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            * {compoundingFrequency.charAt(0).toUpperCase() + compoundingFrequency.slice(1)} compounding applied
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
