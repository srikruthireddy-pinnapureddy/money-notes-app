import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  PiggyBank, 
  Calendar, 
  Percent, 
  IndianRupee,
  ArrowUpRight,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AnimatedCounter } from "./AnimatedCounter";

export function StepUpSIPCalculator() {
  const [monthlyAmount, setMonthlyAmount] = useState(10000);
  const [stepUpPercent, setStepUpPercent] = useState(10);
  const [duration, setDuration] = useState(10);
  const [expectedReturn, setExpectedReturn] = useState(12);

  const calculations = useMemo(() => {
    const monthlyRate = expectedReturn / 12 / 100;
    
    let totalInvested = 0;
    let futureValue = 0;
    let currentMonthly = monthlyAmount;
    const yearlyBreakdown: { year: number; monthly: number; invested: number; value: number }[] = [];
    
    // Calculate year by year
    for (let year = 1; year <= duration; year++) {
      const yearlyInvestment = currentMonthly * 12;
      totalInvested += yearlyInvestment;
      
      // Calculate FV for this year's SIP contributions
      // These contributions will compound for (duration - year + 1) years remaining
      const monthsRemaining = (duration - year + 1) * 12;
      
      for (let month = 1; month <= 12; month++) {
        const monthsToCompound = monthsRemaining - month + 12;
        futureValue += currentMonthly * Math.pow(1 + monthlyRate, monthsToCompound);
      }
      
      yearlyBreakdown.push({
        year,
        monthly: Math.round(currentMonthly),
        invested: Math.round(totalInvested),
        value: Math.round(futureValue),
      });
      
      // Step up for next year
      currentMonthly = currentMonthly * (1 + stepUpPercent / 100);
    }
    
    const totalReturns = futureValue - totalInvested;
    
    // Calculate regular SIP (no step-up) for comparison
    const regularSipInvested = monthlyAmount * duration * 12;
    const regularSipFV = monthlyAmount * 
      ((Math.pow(1 + monthlyRate, duration * 12) - 1) / monthlyRate) * 
      (1 + monthlyRate);
    
    const extraFromStepUp = futureValue - regularSipFV;

    return {
      futureValue: Math.round(futureValue),
      totalInvested: Math.round(totalInvested),
      totalReturns: Math.round(totalReturns),
      returnPercent: (totalReturns / totalInvested) * 100,
      finalMonthly: Math.round(currentMonthly / (1 + stepUpPercent / 100)),
      regularSipFV: Math.round(regularSipFV),
      extraFromStepUp: Math.round(extraFromStepUp),
      yearlyBreakdown,
    };
  }, [monthlyAmount, stepUpPercent, duration, expectedReturn]);

  const investedPercent = (calculations.totalInvested / calculations.futureValue) * 100;
  const returnsPercent = 100 - investedPercent;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          Step-Up SIP Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Monthly Investment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-sm">
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              Starting Monthly SIP
            </Label>
            <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
              <span className="text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(Math.max(500, Number(e.target.value)))}
                className="w-20 h-7 text-sm border-0 bg-transparent p-0 text-right focus-visible:ring-0"
              />
            </div>
          </div>
          <Slider
            value={[monthlyAmount]}
            onValueChange={(v) => setMonthlyAmount(v[0])}
            min={500}
            max={100000}
            step={500}
            className="py-1"
          />
        </div>

        {/* Step-Up Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-sm">
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              Yearly Step-Up
            </Label>
            <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
              <Input
                type="number"
                value={stepUpPercent}
                onChange={(e) => setStepUpPercent(Math.max(0, Math.min(50, Number(e.target.value))))}
                className="w-12 h-7 text-sm border-0 bg-transparent p-0 text-right focus-visible:ring-0"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[stepUpPercent]}
            onValueChange={(v) => setStepUpPercent(v[0])}
            min={0}
            max={50}
            step={1}
            className="py-1"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% (Regular SIP)</span>
            <span>50%</span>
          </div>
        </div>

        {/* Duration & Return Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                Period
              </Label>
              <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-0.5">
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(40, Number(e.target.value))))}
                  className="w-10 h-6 text-xs border-0 bg-transparent p-0 text-right focus-visible:ring-0"
                />
                <span className="text-xs text-muted-foreground">yrs</span>
              </div>
            </div>
            <Slider
              value={[duration]}
              onValueChange={(v) => setDuration(v[0])}
              min={1}
              max={40}
              step={1}
              className="py-1"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1 text-xs">
                <Percent className="h-3 w-3 text-muted-foreground" />
                Return
              </Label>
              <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-0.5">
                <Input
                  type="number"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(Math.max(1, Math.min(30, Number(e.target.value))))}
                  className="w-10 h-6 text-xs border-0 bg-transparent p-0 text-right focus-visible:ring-0"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <Slider
              value={[expectedReturn]}
              onValueChange={(v) => setExpectedReturn(v[0])}
              min={1}
              max={30}
              step={0.5}
              className="py-1"
            />
          </div>
        </div>

        {/* SIP Growth Preview */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>SIP Growth Over Time</span>
            <span className="flex items-center gap-1">
              <span className="font-medium text-foreground">₹{monthlyAmount.toLocaleString("en-IN")}</span>
              <ArrowUpRight className="h-3 w-3 text-amber-500" />
              <span className="font-medium text-foreground">₹{calculations.finalMonthly.toLocaleString("en-IN")}</span>
            </span>
          </div>
          <div className="flex gap-0.5 h-6">
            {calculations.yearlyBreakdown.slice(0, Math.min(duration, 20)).map((year, i) => (
              <motion.div
                key={year.year}
                initial={{ height: 0 }}
                animate={{ height: `${(year.monthly / calculations.finalMonthly) * 100}%` }}
                transition={{ delay: i * 0.05 }}
                className="flex-1 bg-gradient-to-t from-amber-500 to-orange-400 rounded-sm"
                title={`Year ${year.year}: ₹${year.monthly.toLocaleString("en-IN")}/month`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Year 1</span>
            <span>Year {duration}</span>
          </div>
        </div>

        {/* Results */}
        <motion.div
          key={`${monthlyAmount}-${stepUpPercent}-${duration}-${expectedReturn}`}
          initial={{ opacity: 0.8, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 p-4 space-y-4"
        >
          {/* Visual Breakdown */}
          <div className="space-y-2">
            <div className="h-3 rounded-full overflow-hidden bg-muted flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${investedPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-amber-500 rounded-l-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${returnsPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                className="bg-emerald-500 rounded-r-full"
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Invested ({investedPercent.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Returns ({returnsPercent.toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* Future Value */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-1">Projected Value</p>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedCounter value={calculations.futureValue} prefix="₹" />
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <PiggyBank className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-muted-foreground">Invested</span>
              </div>
              <p className="font-semibold text-sm">
                ₹{calculations.totalInvested.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-background/50 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Returns</span>
              </div>
              <p className="font-semibold text-sm text-emerald-600">
                +₹{calculations.totalReturns.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Step-Up Advantage */}
          {stepUpPercent > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Extra earnings from Step-Up</p>
              <p className="text-sm font-semibold text-amber-600">
                +₹{calculations.extraFromStepUp.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                vs Regular SIP: ₹{calculations.regularSipFV.toLocaleString("en-IN")}
              </p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {calculations.returnPercent.toFixed(0)}% total returns over {duration} years
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
}
