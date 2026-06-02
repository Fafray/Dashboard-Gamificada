"use client";

import { useState, useRef } from "react";
import { getStreakMilestone } from "@/lib/gamification";

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
  onCheckin: (result: CheckinResult) => void;
  onUndo: (result: UndoResult) => void;
}

const FREQ_LABEL: Record<string, string> = {
  daily: "Diário", weekly: "Semanal", free: "Livre", nx_week: "por semana",
};

export function ActivityCard({ activity, onCheckin, onUndo }: ActivityCardProps) {
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

  const isNxWeek   = activity.frequency === "nx_week";
  const hasTarget  = !!activity.target_value;
  const weekTarget = activity.weekly_target ?? 1;
  const weeklyDone = isNxWeek && weeklyCount >= weekTarget;

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
                · meta {activity.target_value}{activity.target_unit}
              </span>
            )}
          </div>
        </div>

        {/* Streak ou contador semanal */}
        {isNxWeek ? (
          <div
            className={`act-streak${milestoneFiring ? " streak-milestone" : ""}`}
            style={{ color: weeklyDone ? "var(--accent-green)" : "var(--accent-gold)" }}
          >
            <span>{weeklyDone ? "✓" : `${weeklyCount}/${weekTarget}`}</span>
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
          margin: "10px 0 0", padding: "6px 10px", borderRadius: "8px",
          background: "rgba(247,183,51,.12)", border: "1px solid rgba(247,183,51,.3)",
          fontSize: "11.5px", color: "var(--accent-gold)", fontWeight: 600,
        }}>
          {milestone.emoji} {milestone.name} — {streak} dias seguidos!
        </div>
      )}

      {/* Numeric input */}
      {hasTarget && !isDone && (
        <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="number"
            value={numValue}
            onChange={(e) => setNumValue(e.target.value)}
            min={0}
            step={0.1}
            placeholder={`Meta: ${activity.target_value}`}
            style={{
              flex: 1, height: "38px", borderRadius: "9px", padding: "0 10px",
              background: "var(--bg-surface)", border: "1px solid var(--border-light)",
              color: "var(--text-primary)", fontSize: "14px", fontFamily: "var(--font-space-grotesk)",
              outline: "none",
            }}
          />
          <span style={{ fontSize: "13px", color: "var(--text-muted)", flexShrink: 0 }}>
            {activity.target_unit}
          </span>
        </div>
      )}

      {/* Value registered (done state) */}
      {hasTarget && isDone && activity.todayCheckinXP !== null && (
        <div style={{
          marginTop: "10px", fontSize: "12px", color: "var(--accent-green)",
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          ✓ Registrado hoje
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
            ? (isNxWeek ? `✓ ${weeklyCount}/${weekTarget} esta semana` : "✓ Concluído hoje")
            : hasTarget
            ? `Registrar ${numValue || "—"} ${activity.target_unit ?? ""}`
            : isNxWeek
            ? `Check-in (${weeklyCount}/${weekTarget})`
            : "Fazer check-in"}
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
