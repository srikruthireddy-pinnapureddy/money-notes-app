import { motion } from "framer-motion";
import { Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Investment } from "./InvestmentCard";

type GoalProgressCardProps = {
  investments: Investment[];
};

export function GoalProgressCard({ investments }: GoalProgressCardProps) {
  // Filter investments with goals
  const investmentsWithGoals = investments.filter(
    (inv) => inv.target_amount && inv.target_amount > 0
  );

  if (investmentsWithGoals.length === 0) return null;

  const totalTarget = investmentsWithGoals.reduce(
    (sum, inv) => sum + Number(inv.target_amount),
    0
  );
  const totalCurrent = investmentsWithGoals.reduce(
    (sum, inv) => sum + Number(inv.current_value),
    0
  );
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const goalsCompleted = investmentsWithGoals.filter(
    (inv) => inv.current_value >= inv.target_amount!
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card border rounded-xl p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
            <Target className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-medium">Goal Progress</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          {goalsCompleted}/{investmentsWithGoals.length} completed
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium">{Math.min(overallProgress, 100).toFixed(1)}%</span>
        </div>
        <Progress 
          value={Math.min(overallProgress, 100)} 
          className="h-2 bg-muted"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₹{totalCurrent.toLocaleString()}</span>
          <span>₹{totalTarget.toLocaleString()}</span>
        </div>
      </div>

      {/* Individual Goals */}
      <div className="space-y-3 pt-2 border-t">
        {investmentsWithGoals.slice(0, 3).map((inv) => {
          const progress = (inv.current_value / Number(inv.target_amount)) * 100;
          const isComplete = progress >= 100;

          return (
            <div key={inv.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1 mr-2">{inv.name}</span>
                <div className="flex items-center gap-1.5">
                  {isComplete && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span className={`font-medium ${isComplete ? 'text-emerald-500' : ''}`}>
                    {Math.min(progress, 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={Math.min(progress, 100)} 
                  className={`h-1.5 ${isComplete ? '[&>div]:bg-emerald-500' : ''}`}
                />
                {progress > 100 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center"
                  >
                    <TrendingUp className="h-1.5 w-1.5 text-white" />
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
        {investmentsWithGoals.length > 3 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{investmentsWithGoals.length - 3} more goals
          </p>
        )}
      </div>
    </motion.div>
  );
}
