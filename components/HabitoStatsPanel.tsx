import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Frequency } from "@/lib/db";

export interface HabitoStatItem {
  id: number;
  name: string;
  emoji: string | null;
  color: string;
  frequency: Frequency;
  total_checkins: number;
  total_xp: number;
  last_checkin: string | null;
  current_streak: number;
  best_streak: number;
}

const FREQ_LABEL: Record<Frequency, string> = {
  daily: "diário",
  weekly: "semanal",
  nx_week: "N×/sem",
  free: "livre",
  once: "único",
};

function lastCheckinLabel(date: string | null): { text: string; recent: boolean } {
  if (!date) return { text: "nunca", recent: false };
  const today = new Date().toISOString().slice(0, 10);
  const days = differenceInCalendarDays(parseISO(today), parseISO(date));
  if (days === 0) return { text: "hoje", recent: true };
  if (days === 1) return { text: "ontem", recent: true };
  return { text: `há ${days}d`, recent: false };
}

export function HabitoStatsPanel({ items }: { items: HabitoStatItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="card panel">
      <div className="panel-head">
        <div>
          <h3>Por hábito</h3>
          <p className="panel-help">Desempenho individual</p>
        </div>
        <div className="heat-stats">
          <div className="hs"><b>{items.length}</b><span>hábitos</span></div>
        </div>
      </div>

      <div style={{ marginTop: "8px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 52px 80px 52px",
          gap: "8px",
          padding: "0 2px 8px",
          borderBottom: "1px solid rgba(120,150,180,.12)",
          fontSize: "9.5px",
          color: "var(--text-muted)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          fontFamily: "var(--font-space-grotesk)",
        }}>
          <span>Hábito</span>
          <span style={{ textAlign: "right" }}>Feitos</span>
          <span style={{ textAlign: "right" }}>Streak</span>
          <span style={{ textAlign: "right" }}>Última vez</span>
        </div>

        {items.map((item) => {
          const lc = lastCheckinLabel(item.last_checkin);
          const showStreak = item.frequency !== "free" && item.frequency !== "once";
          return (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 52px 80px 52px",
                gap: "8px",
                padding: "11px 2px",
                alignItems: "center",
                borderBottom: "1px solid rgba(120,150,180,.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>{item.emoji ?? "📌"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: "13px", fontWeight: 500, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>
                    {FREQ_LABEL[item.frequency]} · +{item.total_xp} XP
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: "right",
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}>
                {item.total_checkins}
              </div>

              <div style={{ textAlign: "right" }}>
                {showStreak && item.current_streak > 0 ? (
                  <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "13px", fontWeight: 600, color: "var(--accent-gold)" }}>
                    🔥 {item.current_streak}
                  </div>
                ) : (
                  <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "13px", color: "var(--text-muted)" }}>—</div>
                )}
                {showStreak && item.best_streak > 0 && item.best_streak !== item.current_streak && (
                  <div style={{ fontSize: "9.5px", color: "var(--text-muted)", marginTop: "1px" }}>
                    melhor {item.best_streak}
                  </div>
                )}
              </div>

              <div style={{
                textAlign: "right",
                fontSize: "11.5px",
                color: lc.recent ? "var(--accent-teal)" : "var(--text-muted)",
              }}>
                {lc.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
