"use client";

import { useState, useRef } from "react";
import { getStreakMilestone } from "@/lib/gamification";
import { CATEGORIA_ATRIBUTO, CATEGORIA_LABELS, xpComBonus } from "@/lib/attributes";
import type { Atributos } from "@/lib/attributes";

const COR_ATTR: Record<string, string> = {
  FOR: "#e24b4a", VIT: "#1d9e75", AGI: "#efa527", INT: "#9b8bff", PER: "#3b82f6",
};

interface LevelInfo {
  level: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
}

interface CheckinResult {
  checkin: { id: number; xp_earned: number };
  xpEarned: number;
  newStreak: number;
  weeklyCount: number | null;
  levelInfo: LevelInfo;
  newlyUnlocked: { key: string; name: string; description: string; emoji: string }[];
}

interface UndoResult {
  xpSubtracted: number;
  levelInfo: LevelInfo;
}

interface Activity {
  id: number;
  name: string;
  frequency: "daily" | "weekly" | "free" | "nx_week";
  xp_base: number;
  emoji: string | null;
  color: string;
  categoria: string | null;
  streak: { current: number; longest: number };
  doneToday: boolean;
  todayCheckinId: number | null;
  todayCheckinXP: number | null;
  target_value: number | null;
  target_unit: string | null;
  weekly_target: number | null;
  weeklyCount: number | null;
}

interface ActivityCardProps {
  activity: Activity;
  atributos?: Atributos;
  onCheckin: (result: CheckinResult) => void;
  onUndo: (result: UndoResult) => void;
}

const FREQ_LABEL: Record<string, string> = {
  daily: "DIÁRIA", weekly: "SEMANAL", free: "LIVRE", nx_week: "/ SEM.",
};

export function ActivityCard({ activity, atributos, onCheckin, onUndo }: ActivityCardProps) {
  const [done, setDone] = useState(activity.doneToday);
  const [checkinId, setCheckinId] = useState<number | null>(activity.todayCheckinId);
  const [streak, setStreak] = useState(activity.streak.current);
  const [weeklyCount, setWeeklyCount] = useState(activity.weeklyCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [xpPops, setXpPops] = useState<{ id: number; text: string }[]>([]);
  const [milestoneFiring, setMilestoneFiring] = useState(false);
  // Numeric input state
  const [numValue, setNumValue] = useState<string>(
    activity.target_value ? String(activity.target_value) : ""
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const isNxWeek    = activity.frequency === "nx_week";
  const hasTarget   = !!activity.target_value;

  // Categoria / atributo
  const attrKey      = activity.categoria ? CATEGORIA_ATRIBUTO[activity.categoria] : null;
  const attrCor      = attrKey ? COR_ATTR[attrKey] : "var(--accent-teal)";
  const xpEfetivo    = atributos && activity.categoria
    ? xpComBonus(activity.xp_base, activity.categoria, atributos)
    : activity.xp_base;
  const weekTarget  = activity.weekly_target ?? 1;
  const weeklyDone  = isNxWeek && weeklyCount >= weekTarget;
  const numParsed   = parseFloat(numValue) || 0;
  const targetVal   = activity.target_value ?? 0;
  const barPct      = targetVal > 0 ? Math.min(120, (numParsed / targetVal) * 100) : 0;
  const barStatus   = numParsed >= targetVal * 1.05 ? "over" : numParsed >= targetVal ? "at" : "below";

  function addXpPop(xp: number, newStreak: number) {
    const milestone = getStreakMilestone(newStreak);
    const text = milestone ? `+${xp} XP ${milestone.emoji}` : `+${xp} XP`;
    const id = Date.now();
    setXpPops((prev) => [...prev, { id, text }]);
    setTimeout(() => setXpPops((prev) => prev.filter((x) => x.id !== id)), 1100);
    if (milestone) {
      setMilestoneFiring(true);
      setTimeout(() => setMilestoneFiring(false), 700);
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
      setJustDone(true);
      addXpPop(result.xpEarned, result.newStreak);
      setTimeout(() => setJustDone(false), 720);
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
      const result: UndoResult = await res.json();
      setDone(false);
      setCheckinId(null);
      setStreak((s) => Math.max(0, s - 1));
      if (isNxWeek) setWeeklyCount((c) => Math.max(0, c - 1));
      onUndo(result);
    } finally {
      setLoading(false);
    }
  }

  const milestone = getStreakMilestone(streak);
  const isDone = isNxWeek ? weeklyDone : done;

  return (
    <div
      ref={cardRef}
      className={`act${isDone ? " done" : ""}${justDone ? " justdone" : ""}`}
    >
      <div className="pulse-ring" />

      {xpPops.map((pop) => (
        <div key={pop.id} className="xp-pop go">{pop.text}</div>
      ))}

      {/* Header */}
      <div className="act-head">
        <div className="act-emoji" style={{ borderColor: isDone ? "rgba(47,224,166,.4)" : undefined }}>
          {activity.emoji || "⚡"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="act-name">{activity.name}</div>
          <div className="act-freq">
            <span className="freq-dot" />
            {isNxWeek
              ? `${weekTarget}x ${FREQ_LABEL.nx_week}`
              : FREQ_LABEL[activity.frequency]}
            {hasTarget && (
              <span style={{ marginLeft: "6px", color: "var(--accent-teal)" }}>
                · META: {activity.target_value}{activity.target_unit}
              </span>
            )}
            {activity.categoria && attrKey && (
              <span style={{
                marginLeft: "6px",
                fontSize: "9px", letterSpacing: ".1em", fontWeight: 600,
                color: attrCor,
                background: `${attrCor}18`,
                borderRadius: "4px", padding: "1px 5px",
                textTransform: "uppercase",
                fontFamily: "var(--font-space-grotesk), sans-serif",
              }}>
                {CATEGORIA_LABELS[activity.categoria]} · {attrKey}
              </span>
            )}
          </div>
        </div>

        {/* Streak ou pips semanais */}
        {isNxWeek ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
            <div className="week-pips">
              {Array.from({ length: weekTarget }).map((_, i) => (
                <div
                  key={i}
                  className={`week-pip${i < weeklyCount ? (weeklyDone ? " all-done" : " filled") : ""}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
            <span className={`week-count-text ${weeklyDone ? "done" : weeklyCount > 0 ? "progress" : "empty"}`}>
              {weeklyDone ? "✓ SEMANA OK" : `${weeklyCount}/${weekTarget} ESTA SEM.`}
            </span>
          </div>
        ) : (
          streak > 0 && (
            <div className={`act-streak${milestoneFiring ? " streak-milestone" : ""}`}>
              <span style={{ animation: "flicker 2.4s ease-in-out infinite" }}>🔥</span>
              <span className="num">{streak}</span>
              {milestone && (
                <span style={{ fontSize: "11px", marginLeft: "3px" }}>{milestone.emoji}</span>
              )}
            </div>
          )
        )}
      </div>

      {/* Milestone strip */}
      {milestone && streak > 0 && !isNxWeek && (
        <div style={{
          margin: "10px 0 0", padding: "6px 10px", borderRadius: "6px",
          background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.25)",
          fontSize: "11px", color: "var(--accent-gold)", fontWeight: 700,
          letterSpacing: ".06em", fontFamily: "var(--font-space-grotesk), sans-serif",
          textTransform: "uppercase",
        }}>
          {milestone.emoji} {milestone.name} — {streak} DIAS CONSECUTIVOS
        </div>
      )}

      {/* HUD — Numeric input */}
      {hasTarget && !isDone && (
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
            <span className="hud-target-label">/ {activity.target_value}</span>
          </div>
          <div className="hud-bar-track">
            <div
              className={`hud-bar-fill ${barStatus}`}
              style={{ width: `${Math.min(100, barPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* HUD — Value registered */}
      {hasTarget && isDone && (
        <div className="hud-done-badge">
          <span>✓</span>
          <span className="hud-done-value">{numValue || "—"} {activity.target_unit}</span>
          <span style={{ color: "var(--text-muted)", letterSpacing: ".06em", fontSize: "11px" }}>REGISTRADO</span>
        </div>
      )}

      {/* Footer */}
      <div className="act-foot">
        <button
          className="btn-checkin"
          onClick={handleCheckin}
          disabled={isDone || loading || (isNxWeek && weeklyDone)}
        >
          {loading
            ? "..."
            : isDone
            ? (isNxWeek ? `✓ SEMANA COMPLETA` : "✓ MISSÃO CONCLUÍDA")
            : hasTarget && numValue
            ? `REGISTRAR ${numValue} ${activity.target_unit ?? ""}`
            : isNxWeek
            ? `EXECUTAR ${weeklyCount + 1}/${weekTarget}`
            : `COMPLETAR · +${xpEfetivo} XP`}
        </button>

        {checkinId && (
          <button className="btn-undo" onClick={handleUndo} title="Desfazer último check-in">
            ↩
          </button>
        )}
      </div>
    </div>
  );
}
