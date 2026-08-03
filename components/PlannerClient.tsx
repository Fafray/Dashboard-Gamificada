"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HourlyPlan {
  id: number;
  plan_date: string;
  hour: number;
  text: string;
  duration: number;
  done: boolean;
}

export interface HourSuggestion {
  emoji: string;
  text: string;
  source: "agenda" | "habito";
}

const START_HOUR = 6;
const END_HOUR = 23; // inclusive

interface RowValue {
  text: string;
  duration: number;
  done: boolean;
}

interface PlannerClientProps {
  initialDate: string;
  initialRows: HourlyPlan[];
  initialSuggestions: Record<number, HourSuggestion[]>;
}

function rowsToMap(rows: HourlyPlan[]): Record<number, RowValue> {
  const map: Record<number, RowValue> = {};
  for (const r of rows) map[r.hour] = { text: r.text, duration: r.duration, done: r.done };
  return map;
}

export function PlannerClient({ initialDate, initialRows, initialSuggestions }: PlannerClientProps) {
  const [date, setDate] = useState(initialDate);
  const [values, setValues] = useState<Record<number, RowValue>>(() => rowsToMap(initialRows));
  const [suggestions, setSuggestions] = useState<Record<number, HourSuggestion[]>>(initialSuggestions);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(new Set());
  const currentHourRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const loadDate = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planner?date=${d}`);
      const data: { rows: HourlyPlan[]; suggestions: Record<number, HourSuggestion[]> } = await res.json();
      setValues(rowsToMap(data.rows));
      setSuggestions(data.suggestions ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date === initialDate) return;
    loadDate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (scrolledRef.current) return;
    if (!isToday(parseISO(date))) return;
    if (currentHourRef.current) {
      currentHourRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
      scrolledRef.current = true;
    }
  }, [date, values]);

  const weekWindow = useMemo(() => {
    const center = parseISO(date);
    return Array.from({ length: 7 }, (_, i) => addDays(center, i - 3));
  }, [date]);

  useEffect(() => {
    const start = format(weekWindow[0], "yyyy-MM-dd");
    const end = format(weekWindow[6], "yyyy-MM-dd");
    fetch(`/api/planner/summary?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((dates: string[]) => setDatesWithEntries(new Set(dates)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekWindow]);

  function goTo(d: Date) {
    setDate(format(d, "yyyy-MM-dd"));
  }

  async function persist(hour: number, patch: { text?: string; duration?: number; done?: boolean }) {
    await fetch("/api/planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, hour, ...patch }),
    });
  }

  function handleTextChange(hour: number, text: string) {
    setValues((prev) => ({ ...prev, [hour]: { text, duration: prev[hour]?.duration ?? 1, done: prev[hour]?.done ?? false } }));
  }

  function handleTextBlur(hour: number) {
    const v = values[hour];
    persist(hour, { text: v?.text ?? "" });
  }

  function handleDurationChange(hour: number, duration: number) {
    setValues((prev) => ({ ...prev, [hour]: { ...prev[hour], duration } }));
    persist(hour, { duration });
  }

  function handleToggleDone(hour: number) {
    const v = values[hour];
    if (!v?.text) return;
    const done = !v.done;
    setValues((prev) => ({ ...prev, [hour]: { ...prev[hour], done } }));
    persist(hour, { done });
  }

  function useSuggestion(hour: number, s: HourSuggestion) {
    setValues((prev) => ({ ...prev, [hour]: { text: s.text, duration: 1, done: false } }));
    persist(hour, { text: s.text, duration: 1 });
  }

  // Maior duração possível a partir de `hour` sem invadir uma hora que já tem texto próprio
  function maxDurationForHour(hour: number): number {
    let d = 1;
    while (hour + d <= END_HOUR && !(values[hour + d]?.text)) d++;
    return d;
  }

  const dateObj = parseISO(date);
  const viewingToday = isToday(dateObj);
  const currentHour = viewingToday ? now.getHours() : -1;
  const dateLabel = format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
  const capitalizedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  // Horas cobertas por um bloco anterior de duração > 1
  const covered = new Set<number>();
  for (const [hourStr, v] of Object.entries(values)) {
    const hour = Number(hourStr);
    for (let i = 1; i < (v.duration ?? 1); i++) covered.add(hour + i);
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
    .filter((h) => !covered.has(h));

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
          {!viewingToday && (
            <button onClick={() => goTo(new Date())} style={{ ...navBtnStyle, width: "auto", padding: "0 12px", fontSize: "12px" }}>
              Hoje
            </button>
          )}
          <button onClick={() => goTo(addDays(dateObj, 1))} style={navBtnStyle} title="Próximo dia">›</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {weekWindow.map((d) => {
          const dStr = format(d, "yyyy-MM-dd");
          const isSelected = dStr === date;
          const isTodayDay = isToday(d);
          const hasEntries = dStr === date
            ? Object.values(values).some((v) => v.text)
            : datesWithEntries.has(dStr);
          return (
            <button
              key={dStr}
              onClick={() => setDate(dStr)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                padding: "8px 4px", borderRadius: "10px", cursor: "pointer",
                background: isSelected ? "var(--accent-violet)" : "transparent",
                border: `1px solid ${isSelected ? "var(--accent-violet)" : "var(--border)"}`,
                transition: "background .15s, border-color .15s",
              }}
            >
              <span style={{
                fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
                color: isSelected ? "var(--bg-base)" : "var(--text-muted)",
              }}>
                {format(d, "EEEEE", { locale: ptBR })}
              </span>
              <span style={{
                fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-space-grotesk)",
                color: isSelected ? "var(--bg-base)" : isTodayDay ? "var(--accent-violet)" : "var(--text-primary)",
              }}>
                {d.getDate()}
              </span>
              <span style={{
                width: "4px", height: "4px", borderRadius: "50%",
                background: hasEntries ? (isSelected ? "var(--bg-base)" : "var(--accent-violet)") : "transparent",
              }} />
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: "8px 20px", opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
        {hours.map((hour) => {
          const v = values[hour];
          const duration = v?.duration ?? 1;
          const endHour = hour + duration;
          const isCurrent = hour === currentHour;
          const hourSuggestions = (suggestions[hour] ?? []).filter(() => !v?.text);
          const maxDuration = maxDurationForHour(hour);

          return (
            <div
              key={hour}
              ref={isCurrent ? currentHourRef : undefined}
              style={{
                padding: "10px 0", borderBottom: "1px solid var(--border)",
                borderLeft: isCurrent ? "2px solid var(--accent-violet)" : "2px solid transparent",
                paddingLeft: isCurrent ? "10px" : "0",
                marginLeft: isCurrent ? "-12px" : "0",
                background: isCurrent ? "var(--bg-surface)" : "transparent",
                transition: "background .2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: "12px", fontWeight: 700,
                  color: isCurrent ? "var(--accent-violet)" : "var(--text-muted)", flexShrink: 0,
                }}>
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>até</span>
                {maxDuration > 1 ? (
                  <select
                    value={duration}
                    onChange={(e) => handleDurationChange(hour, Number(e.target.value))}
                    title="Editar até que horas vai este bloco"
                    style={{
                      fontFamily: "var(--font-space-grotesk)", fontSize: "12px", fontWeight: 700,
                      color: isCurrent ? "var(--accent-violet)" : "var(--text-muted)",
                      background: "transparent", border: "none", borderBottom: "1px dashed var(--border-light)",
                      cursor: "pointer", flexShrink: 0, padding: "0 2px",
                    }}
                  >
                    {Array.from({ length: maxDuration }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{String(hour + d).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                ) : (
                  <span style={{
                    fontFamily: "var(--font-space-grotesk)", fontSize: "12px", fontWeight: 700,
                    color: isCurrent ? "var(--accent-violet)" : "var(--text-muted)", flexShrink: 0,
                  }}>
                    {String(endHour).padStart(2, "0")}:00
                  </span>
                )}
                <span style={{ width: "6px", flexShrink: 0 }} />
                <input
                  type="text"
                  value={v?.text ?? ""}
                  onChange={(e) => handleTextChange(hour, e.target.value)}
                  onBlur={() => handleTextBlur(hour)}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  placeholder="—"
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    color: v?.done ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: v?.done ? "line-through" : "none",
                    fontSize: "14px", padding: "4px 0",
                  }}
                />
                <button
                  onClick={() => handleToggleDone(hour)}
                  disabled={!v?.text}
                  title={v?.done ? "Marcar como pendente" : "Marcar como concluído"}
                  style={{
                    width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                    background: v?.done ? "var(--accent-green)" : "transparent",
                    border: `1px solid ${v?.done ? "var(--accent-green)" : "var(--border)"}`,
                    color: v?.done ? "var(--bg-base)" : "var(--text-muted)",
                    cursor: v?.text ? "pointer" : "default", opacity: v?.text ? 1 : 0.4,
                    fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {v?.done ? "✓" : ""}
                </button>
              </div>

              {hourSuggestions.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px", marginLeft: "50px" }}>
                  {hourSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => useSuggestion(hour, s)}
                      title="Usar no planner"
                      style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        fontSize: "11px", padding: "3px 8px", borderRadius: "999px",
                        background: "var(--bg-surface)", border: "1px solid var(--border)",
                        color: "var(--text-secondary)", cursor: "pointer",
                      }}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.text}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>+ usar</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
