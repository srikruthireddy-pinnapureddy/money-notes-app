import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#f97316",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export interface ChartData {
  type: "pie" | "bar";
  title?: string;
  data: { name: string; value: number }[];
}

export function parseCharts(text: string): (string | ChartData)[] {
  const parts: (string | ChartData)[] = [];
  const regex = /```chart\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.data && Array.isArray(parsed.data)) {
        parts.push({
          type: parsed.type || "pie",
          title: parsed.title,
          data: parsed.data,
        });
      } else {
        parts.push(match[0]);
      }
    } catch {
      parts.push(match[0]);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function InlineChart({ chart }: { chart: ChartData }) {
  if (chart.type === "bar") {
    return (
      <div className="my-3">
        {chart.title && <p className="text-xs font-medium text-muted-foreground mb-2">{chart.title}</p>}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart.data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="my-3">
      {chart.title && <p className="text-xs font-medium text-muted-foreground mb-2">{chart.title}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chart.data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chart.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`₹${value.toFixed(2)}`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: "10px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
