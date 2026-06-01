"use client";

import { useMemo } from "react";
import { format, subDays, startOfWeek, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeatmapProps {
  data: { date: string; count: number }[];
  weeks?: number;
}

const COLORS = [
  "var(--bg-surface)",    // 0
  "#14532d",              // 1
  "#166534",              // 2
  "#15803d",              // 3-4
  "#22c55e",              // 5+
];

function getColor(count: number): string {
  if (count === 0) return COLORS[0];
  if (count === 1) return COLORS[1];
  if (count === 2) return COLORS[2];
  if (count <= 4) return COLORS[3];
  return COLORS[4];
}

const DAY_LABELS = ["", "Seg", "", "Qua", "", "Sex", ""];

export function Heatmap({ data, weeks = 52 }: HeatmapProps) {
  const { grid, monthLabels } = useMemo(() => {
    const countMap = new Map(data.map((d) => [d.date, d.count]));
    const today = new Date();
    const totalDays = weeks * 7;
    const startDate = startOfWeek(subDays(today, totalDays - 1), { weekStartsOn: 1 });

    const cols: { date: string; count: number }[][] = [];
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks + 1; w++) {
      const col: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        if (date > today) {
          col.push({ date: "", count: -1 });
          continue;
        }
        const dateStr = format(date, "yyyy-MM-dd");
        col.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 });

        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth();
          months.push({
            label: format(date, "MMM", { locale: ptBR }),
            col: w,
          });
        }
      }
      cols.push(col);
    }

    return { grid: cols, monthLabels: months };
  }, [data, weeks]);

  return (
    <div className="overflow-x-auto">
      <div style={{ display: "inline-block", minWidth: "max-content" }}>
        {/* Month labels */}
        <div style={{ display: "flex", marginLeft: "28px", marginBottom: "4px" }}>
          {monthLabels.map((m, i) => {
            const nextCol = monthLabels[i + 1]?.col ?? grid.length;
            const width = (nextCol - m.col) * 14;
            return (
              <div
                key={`${m.label}-${i}`}
                style={{ width, fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}
              >
                {m.label}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "2px" }}>
          {/* Day labels */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginRight: "4px" }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  height: "12px",
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  width: "20px",
                  justifyContent: "flex-end",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          {grid.map((col, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {col.map((cell, di) => (
                <div
                  key={di}
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "2px",
                    background: cell.count < 0 ? "transparent" : getColor(cell.count),
                    opacity: cell.count < 0 ? 0 : 1,
                    cursor: cell.count > 0 ? "default" : "default",
                  }}
                  title={
                    cell.date
                      ? `${cell.date}: ${cell.count} check-in${cell.count !== 1 ? "s" : ""}`
                      : undefined
                  }
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "8px",
            marginLeft: "28px",
          }}
        >
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Menos</span>
          {COLORS.map((c, i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                background: c,
              }}
            />
          ))}
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Mais</span>
        </div>
      </div>
    </div>
  );
}
