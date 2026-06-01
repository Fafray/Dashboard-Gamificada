"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface XPChartProps {
  data: { date: string; xp: number }[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "12px",
      }}
    >
      <p style={{ color: "var(--text-muted)", marginBottom: "2px" }}>
        {format(parseISO(label), "d MMM", { locale: ptBR })}
      </p>
      <p style={{ color: "var(--accent-gold)", fontWeight: 600 }}>
        +{payload[0].value} XP
      </p>
    </div>
  );
}

export function XPChart({ data }: XPChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-32 rounded-xl"
        style={{ background: "var(--bg-surface)", color: "var(--text-muted)", fontSize: "14px" }}
      >
        Nenhum dado ainda
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM"),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={formatted} barSize={8} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-card-hover)" }} />
        <Bar dataKey="xp" fill="var(--accent-gold)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
