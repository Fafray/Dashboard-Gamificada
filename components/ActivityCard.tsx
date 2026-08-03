"use client";

import { useState } from "react";

interface CheckinResult {
  checkin: { id: number };
  newStreak: number;
  weeklyCount: number | null;
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
  due_date?: string | null;
}

interface ActivityCardProps {
  activity: Activity;
  initialAccumulated?: number | null;
  onCheckin: (result: CheckinResult) => void;
  onUndo: () => void;
}

function defaultIncrement(unit: string | null): number {
  if (!unit) return 1;
  const u = unit.toUpperCase();
  if (u === "L") return 0.5;
  if (u === "ML") return 250;
  if (u === "H") return 1;
  if (u === "MIN") return 10;
  if (u === "KM") return 1;
  if (u === "PÁGINAS" || u === "PG" || u === "PAG") return 5;
  return 1;
}

export function ActivityCard({ activity, initialAccumulated, onCheckin, onUndo }: ActivityCardProps) {
  const [done, setDone] = useState(activity.doneToday);
  const [checkinId, setCheckinId] = useState<number | null>(activity.todayCheckinId);
  const [streak, setStreak] = useState(activity.streak.current);
  const [weeklyCount, setWeeklyCount] = useState(activity.weeklyCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [numValue, setNumValue] = useState<string>(
    activity.target_value ? String(activity.target_value) : ""
  );
  const isIncremental = activity.frequency === "daily" && !!activity.target_value;
  const [accumulated, setAccumulated] = useState<number>(initialAccumulated ?? 0);
  const [incrementInput, setIncrementInput] = useState<string>(
    String(defaultIncrement(activity.target_unit))
  );

  const isNxWeek  = activity.frequency === "nx_week";
  const isOnce    = activity.frequency === "once";
  const hasTarget = !!activity.target_value;

  const daysLeft = (() => {
    if (!isOnce || !activity.due_date) return null;
    const today = new Date().toISOString().slice(0, 10);
    const due   = activity.due_date;
    if (due < today) return -1;
    if (due === today) return 0;
    const diff = Math.ceil((new Date(due + "T23:59:59").getTime() - Date.now()) / 86400000);
    return diff;
  })();

  const weekTarget = activity.weekly_target ?? 1;
  const weeklyDone = isNxWeek && weeklyCount >= weekTarget;
  const isDone     = isNxWeek ? weeklyDone : done;

  async function handleAccumulate() {
    const inc = parseFloat(incrementInput);
    if (!inc || inc <= 0 || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkins/accumulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activity.id, increment: inc }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao registrar");
        return;
      }
      const result = await res.json();
      setAccumulated(result.total);
      setCheckinId(result.checkinId);
      if (result.targetReached) {
        setDone(true);
        onCheckin({ checkin: { id: result.checkinId }, newStreak: streak, weeklyCount: null });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin() {
    if (done || loading || weeklyDone) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = { activity_id: activity.id };
      if (hasTarget && numValue) body.actual_value = parseFloat(numValue);

      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao registrar check-in");
        return;
      }
      const result: CheckinResult = await res.json();

      if (isNxWeek) {
        const newCount = result.weeklyCount ?? weeklyCount + 1;
        setWeeklyCount(newCount);
        if (newCount >= weekTarget) setDone(true);
      } else {
        setDone(true);
      }

      setCheckinId(result.checkin.id);
      setStreak(result.newStreak);
      onCheckin(result);
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo() {
    if (!checkinId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checkins/${checkinId}`, { method: "DELETE" });
      if (!res.ok) return;
      setDone(false);
      setCheckinId(null);
      setStreak((s) => Math.max(0, s - 1));
      if (isNxWeek) setWeeklyCount((c) => Math.max(0, c - 1));
      onUndo();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`act${isDone ? " done" : ""}`}>
      <div className="act-head">
        <div className="act-emoji">{activity.emoji || "•"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="act-name">{activity.name}</div>
        </div>
        {!isOnce && !isNxWeek && streak > 0 && (
          <div className="act-streak">
            <span>🔥</span>
            <span className="num">{streak}</span>
          </div>
        )}
      </div>

      {isOnce && daysLeft !== null && (
        <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 700, color: daysLeft <= 0 ? "var(--accent-red)" : "var(--text-secondary)" }}>
          {daysLeft <= 0 ? "PRAZO: HOJE" : daysLeft === 1 ? "PRAZO: AMANHÃ" : `PRAZO: ${daysLeft}d`}
        </div>
      )}

      {isNxWeek && (
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "3px" }}>
          <div className="week-pips">
            {Array.from({ length: weekTarget }).map((_, i) => (
              <div key={i} className={`week-pip${i < weeklyCount ? (weeklyDone ? " all-done" : " filled") : ""}`} />
            ))}
          </div>
          <span className={`week-count-text ${weeklyDone ? "done" : weeklyCount > 0 ? "progress" : "empty"}`}>
            {weeklyDone ? "✓ semana ok" : `${weeklyCount}/${weekTarget} esta sem.`}
          </span>
        </div>
      )}

      {isIncremental && (
        <div className="hud-input-wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: isDone ? "var(--accent-green)" : "var(--text-primary)" }}>
              {accumulated % 1 === 0 ? accumulated : accumulated.toFixed(1)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              / {activity.target_value} {activity.target_unit}
            </span>
          </div>
          <div className="hud-bar-track">
            <div
              className={`hud-bar-fill ${accumulated >= (activity.target_value ?? 0) ? "at" : "below"}`}
              style={{ width: `${Math.min(100, (accumulated / (activity.target_value ?? 1)) * 100)}%` }}
            />
          </div>
          {!isDone && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px" }}>
              <input
                type="number"
                value={incrementInput}
                onChange={(e) => setIncrementInput(e.target.value)}
                min={0.1}
                step={defaultIncrement(activity.target_unit)}
                style={{
                  width: "64px", padding: "6px 8px", borderRadius: "8px",
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: "13px", fontWeight: 600,
                  textAlign: "center", outline: "none",
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{activity.target_unit}</span>
              <button className="btn-checkin" onClick={handleAccumulate} disabled={loading} style={{ flex: 1 }}>
                {loading ? "..." : "+ Adicionar"}
              </button>
            </div>
          )}
        </div>
      )}

      {hasTarget && !isIncremental && !isDone && (
        <div className="hud-input-wrap">
          <div className="hud-input-row">
            <input
              type="number"
              value={numValue}
              onChange={(e) => setNumValue(e.target.value)}
              min={0}
              step={0.1}
              placeholder={String(activity.target_value)}
            />
            <span className="hud-unit">{activity.target_unit}</span>
          </div>
        </div>
      )}

      <div className="act-foot">
        {isIncremental ? (
          isDone && (
            <button className="btn-checkin" disabled style={{ opacity: 0.7 }}>✓ Meta atingida</button>
          )
        ) : (
          <button
            className="btn-checkin"
            onClick={handleCheckin}
            disabled={isDone || loading}
            style={{ flex: 1 }}
          >
            {loading ? "..." : isDone
              ? (isNxWeek ? "✓ Semana completa" : "✓ Concluído")
              : hasTarget && numValue ? `Registrar ${numValue} ${activity.target_unit ?? ""}`
              : isNxWeek ? `Executar ${weeklyCount + 1}/${weekTarget}`
              : "Completar"}
          </button>
        )}
        {checkinId && (
          <button className="btn-undo" onClick={handleUndo} title="Desfazer último check-in">↩</button>
        )}
      </div>
    </div>
  );
}
