"use client";

import { useState } from "react";
import Link from "next/link";
import { ActivityCard } from "./ActivityCard";
import { NotificationSetup } from "./NotificationSetup";

const CATEGORIA_COR: Record<string, string> = {
  saude: "#25d99a", treino: "#f0556a", estudo: "#45cdf0", disciplina: "#ffce47", foco: "#8b5cf6",
};
const CATEGORIA_LABELS: Record<string, string> = {
  saude: "Saúde", treino: "Treino", estudo: "Estudo", disciplina: "Disciplina", foco: "Foco",
};
const CATEGORIAS_ORDEM = ["saude", "treino", "estudo", "disciplina", "foco"] as const;
const SEM_CATEGORIA = "__sem__";

interface TodayTask {
  id: number;
  name: string;
  emoji: string | null;
  due_date: string;
  due_time: string | null;
  category: string | null;
}

interface TodayPlanItem {
  hour: number;
  text: string;
}

interface Activity {
  id: number;
  name: string;
  frequency: "daily" | "weekly" | "free" | "nx_week" | "once";
  emoji: string | null;
  color: string;
  categoria: string | null;
  streak: { current: number; longest: number };
  doneToday: boolean;
  todayCheckinId: number | null;
  target_value: number | null;
  target_unit: string | null;
  weekly_target: number | null;
  weeklyCount: number | null;
  todayCheckinValue: number | null;
  scheduled_days: string | null;
  due_date: string | null;
}

interface DashboardClientProps {
  activities: Activity[];
  dateLabel: string;
  todayTasks: TodayTask[];
  todayPlan: TodayPlanItem[];
}

export function DashboardClient({ activities: initialActivities, dateLabel, todayTasks, todayPlan }: DashboardClientProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [doneSet, setDoneSet] = useState<Set<number>>(
    () => new Set(initialActivities.filter((a) => a.doneToday).map((a) => a.id))
  );

  const toggleCollapse = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const nonFreeActivities = initialActivities.filter((a) => a.frequency !== "free");
  const doneCount = nonFreeActivities.filter((a) => doneSet.has(a.id)).length;
  const totalCount = nonFreeActivities.length;

  const maxStreak = initialActivities.reduce((m, a) => Math.max(m, a.streak.current), 0);

  return (
    <div className="page">
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">Hoje</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", letterSpacing: ".06em" }}>
            {dateLabel}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {maxStreak > 0 && (
            <div className="chip streak">
              <span className="flame">🔥</span>
              <b className="num">{maxStreak}</b>
              <span>dias</span>
            </div>
          )}
          {totalCount > 0 && (
            <div className="chip">
              <span className="num">{doneCount}</span>
              <span>/{totalCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hábitos por categoria */}
      <div className="section">
        {initialActivities.length === 0 ? (
          <EmptyState />
        ) : (
          (() => {
            const catKeys = [
              ...CATEGORIAS_ORDEM.filter((c) => initialActivities.some((a) => a.categoria === c)),
              ...(initialActivities.some((a) => !a.categoria) ? [SEM_CATEGORIA] : []),
            ];

            return catKeys.map((cat) => {
              const items = initialActivities
                .filter((a) => (a.categoria ?? SEM_CATEGORIA) === cat)
                .sort((a, b) => {
                  const aDone = doneSet.has(a.id) ? 1 : 0;
                  const bDone = doneSet.has(b.id) ? 1 : 0;
                  return aDone - bDone;
                });
              if (items.length === 0) return null;

              const cor     = CATEGORIA_COR[cat] ?? "var(--accent-violet)";
              const label   = cat === SEM_CATEGORIA ? "Sem categoria" : (CATEGORIA_LABELS[cat] ?? cat);
              const doneCat = items.filter((a) => doneSet.has(a.id)).length;
              const isOpen  = !collapsed[cat];

              return (
                <div key={cat} style={{ marginBottom: "24px" }}>
                  <button
                    onClick={() => toggleCollapse(cat)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      width: "100%", background: "none", border: "none",
                      cursor: "pointer", padding: "0 0 12px", textAlign: "left",
                    }}
                  >
                    <div style={{ width: "3px", height: "18px", borderRadius: "2px", background: cor, flexShrink: 0 }} />
                    <span style={{
                      fontFamily: "var(--font-space-grotesk)", fontSize: "13px", fontWeight: 700,
                      letterSpacing: ".08em", textTransform: "uppercase", color: cor,
                    }}>
                      {label}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {doneCat}/{items.length}
                    </span>
                    <span style={{
                      marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)",
                      display: "inline-block", transition: "transform .2s",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}>▶</span>
                  </button>

                  {isOpen && (
                    <div className="act-grid">
                      {items.map((activity) => (
                        <ActivityCard
                          key={activity.id}
                          activity={{ ...activity, doneToday: doneSet.has(activity.id) }}
                          initialAccumulated={activity.todayCheckinValue}
                          onCheckin={() => setDoneSet((prev) => new Set([...prev, activity.id]))}
                          onUndo={() => setDoneSet((prev) => {
                            const next = new Set(prev);
                            next.delete(activity.id);
                            return next;
                          })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Notificações PWA */}
      <div className="section">
        <NotificationSetup />
      </div>

      {/* Agenda de Hoje */}
      {todayTasks.length > 0 && (
        <div className="section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
            <h2 style={{ margin: 0 }}>📅 Agenda de Hoje</h2>
            <Link href="/agenda" style={{ fontSize: "11px", color: "var(--accent-teal)", textDecoration: "none", letterSpacing: ".06em" }}>
              Ver tudo →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {todayTasks.map((t) => (
              <div key={t.id} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "16px" }}>{t.emoji ?? "📌"}</span>
                <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</span>
                {t.due_time && (
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{t.due_time}</span>
                )}
                {t.due_date < new Date().toISOString().slice(0, 10) && (
                  <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700, letterSpacing: ".07em" }}>ATRASADA</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planner de Hoje */}
      {todayPlan.length > 0 && (
        <div className="section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
            <h2 style={{ margin: 0 }}>🕒 Planner de Hoje</h2>
            <Link href="/planner" style={{ fontSize: "11px", color: "var(--accent-teal)", textDecoration: "none", letterSpacing: ".06em" }}>
              Ver tudo →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {todayPlan.map((p) => (
              <div key={p.hour} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, minWidth: "40px" }}>
                  {String(p.hour).padStart(2, "0")}:00
                </span>
                <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card" style={{ padding: "40px", textAlign: "center" }}>
      <p style={{ fontSize: "40px", marginBottom: "12px" }}>○</p>
      <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", letterSpacing: ".1em", fontFamily: "var(--font-space-grotesk), sans-serif", textTransform: "uppercase" }}>
        Nenhum hábito cadastrado
      </p>
      <p style={{ fontSize: "12.5px", color: "var(--text-muted)", letterSpacing: ".04em" }}>
        Cadastre seus primeiros hábitos para começar
      </p>
    </div>
  );
}
