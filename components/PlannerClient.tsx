"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HourlyPlan {
  id: number;
  plan_date: string;
  hour: number;
  text: string;
}

const START_HOUR = 6;
const END_HOUR = 23; // inclusive

interface PlannerClientProps {
  initialDate: string;
  initialRows: HourlyPlan[];
}

function rowsToMap(rows: HourlyPlan[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const r of rows) map[r.hour] = r.text;
  return map;
}

export function PlannerClient({ initialDate, initialRows }: PlannerClientProps) {
  const [date, setDate] = useState(initialDate);
  const [values, setValues] = useState<Record<number, string>>(() => rowsToMap(initialRows));
  const [loading, setLoading] = useState(false);

  const loadDate = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planner?date=${d}`);
      const rows: HourlyPlan[] = await res.json();
      setValues(rowsToMap(rows));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date === initialDate) return;
    loadDate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function goTo(d: Date) {
    setDate(format(d, "yyyy-MM-dd"));
  }

  async function saveHour(hour: number, text: string) {
    await fetch("/api/planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, hour, text }),
    });
  }

  function handleChange(hour: number, text: string) {
    setValues((prev) => ({ ...prev, [hour]: text }));
  }

  function handleBlur(hour: number) {
    saveHour(hour, values[hour] ?? "");
  }

  const dateObj = parseISO(date);
  const dateLabel = format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
  const capitalizedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">Planner</p>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>
            {capitalizedDate}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => goTo(subDays(dateObj, 1))} style={navBtnStyle} title="Dia anterior">‹</button>
          {!isToday(dateObj) && (
            <button onClick={() => goTo(new Date())} style={{ ...navBtnStyle, width: "auto", padding: "0 12px", fontSize: "12px" }}>
              Hoje
            </button>
          )}
          <button onClick={() => goTo(addDays(dateObj, 1))} style={navBtnStyle} title="Próximo dia">›</button>
        </div>
      </div>

      <div className="card" style={{ padding: "8px 20px", opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
        {hours.map((hour) => (
          <div
            key={hour}
            style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "10px 0", borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{
              fontFamily: "var(--font-space-grotesk)", fontSize: "12.5px", fontWeight: 700,
              color: "var(--text-muted)", minWidth: "44px", flexShrink: 0,
            }}>
              {String(hour).padStart(2, "0")}:00
            </span>
            <input
              type="text"
              value={values[hour] ?? ""}
              onChange={(e) => handleChange(hour, e.target.value)}
              onBlur={() => handleBlur(hour)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              placeholder="—"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--text-primary)", fontSize: "14px", padding: "4px 0",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: "32px", height: "32px", borderRadius: "8px",
  background: "var(--bg-surface)", border: "1px solid var(--border)",
  color: "var(--text-secondary)", cursor: "pointer", fontSize: "16px",
  display: "flex", alignItems: "center", justifyContent: "center",
};
