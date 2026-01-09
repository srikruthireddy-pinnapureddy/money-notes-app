import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PieChart as PieChartIcon, Loader2 } from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  "hsl(262, 83%, 58%)", // primary purple
  "hsl(340, 82%, 52%)", // accent pink
  "hsl(142, 71%, 45%)", // success green
  "hsl(217, 91%, 60%)", // blue
  "hsl(45, 93%, 47%)",  // amber
  "hsl(180, 60%, 45%)", // teal
  "hsl(280, 70%, 50%)", // violet
  "hsl(20, 90%, 50%)",  // orange
];

export function SpendingCategoryChart() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    fetchCategoryData();
  }, []);

  const fetchCategoryData = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions, error } = await supabase
        .from("personal_transactions")
        .select("category, amount")
        .eq("type", "expense")
        .gte("transaction_date", startOfMonth.toISOString());

      if (error) throw error;

      // Aggregate by category
      const categoryMap: Record<string, number> = {};
      let total = 0;

      transactions?.forEach((t) => {
        const category = t.category || "Other";
        categoryMap[category] = (categoryMap[category] || 0) + Number(t.amount);
        total += Number(t.amount);
      });

      setTotalSpent(total);

      // Convert to array and sort by value
      const chartData = Object.entries(categoryMap)
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Top 6 categories

      setData(chartData);
    } catch (error) {
      console.error("Error fetching category data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Spending by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <PieChartIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No expenses this month</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Spending by Category
        </CardTitle>
        <p className="text-xs text-muted-foreground">This month</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 space-y-1.5">
          {data.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
              </div>
              <span className="font-medium">${item.value.toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total spent</span>
            <span className="font-bold text-primary">${totalSpent.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
