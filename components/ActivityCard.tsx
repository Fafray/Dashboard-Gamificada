"use client";

import { useState } from "react";

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
  frequency: "daily" | "weekly" | "free";
  xp_base: number;
  emoji: string | null;
  color: string;
  streak: { current: number; longest: number };
  doneToday: boolean;
  todayCheckinId: number | null;
  todayCheckinXP: number | null;
}

interface ActivityCardProps {
  activity: Activity;
  onCheckin: (result: CheckinResult) => void;
  onUndo: (result: UndoResult) => void;
}

export function ActivityCard({ activity, onCheckin, onUndo }: ActivityCardProps) {
  const [done, setDone] = useState(activity.doneToday);
  const [checkinId, setCheckinId] = useState<number | null>(activity.todayCheckinId);
  const [currentStreak, setCurrentStreak] = useState(activity.streak.current);
  const [loading, setLoading] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  const frequencyLabel = { daily: "Diário", weekly: "Semanal", free: "Livre" }[activity.frequency];

  async function handleCheckin() {
    if (done || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activity.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao registrar check-in");
        return;
      }
      const result: CheckinResult = await res.json();
      setDone(true);
      setCheckinId(result.checkin.id);
      setCurrentStreak(result.newStreak);
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 600);
      onCheckin(result);
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo() {
    if (!done || !checkinId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checkins/${checkinId}`, { method: "DELETE" });
      if (!res.ok) return;
      const result: UndoResult = await res.json();
      setDone(false);
      setCheckinId(null);
      setCurrentStreak(Math.max(0, currentStreak - 1));
      onUndo(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="activity-card rounded-xl p-4 flex items-center gap-4"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${done ? activity.color + "40" : "var(--border)"}`,
      }}
    >
      {/* Emoji */}
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl flex-shrink-0"
        style={{
          background: activity.color + "20",
          border: `1px solid ${activity.color}40`,
        }}
      >
        {activity.emoji || "⚡"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p
            className="font-semibold truncate"
            style={{ color: done ? "var(--text-secondary)" : "var(--text-primary)" }}
          >
            {activity.name}
          </p>
          <span
            className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: "var(--bg-surface)", color: "var(--text-muted)", fontSize: "10px" }}
          >
            {frequencyLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1">
              <span className="streak-glow">🔥</span>
              <span className="text-sm font-medium" style={{ color: "var(--accent-gold)" }}>
                {currentStreak}d
              </span>
            </div>
          )}
          {activity.streak.longest > 0 && activity.streak.longest !== currentStreak && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              melhor: {activity.streak.longest}d
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            +{activity.xp_base} XP
          </span>
        </div>
      </div>

      {/* Undo button (only when done) */}
      {done && checkinId && (
        <button
          onClick={handleUndo}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
          title="Desfazer check-in"
        >
          ↩
        </button>
      )}

      {/* Check-in button */}
      <button
        onClick={handleCheckin}
        disabled={done || loading}
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-200 ${justChecked ? "check-pulse" : ""}`}
        style={
          done
            ? {
                background: "var(--accent-green)" + "20",
                border: `1px solid var(--accent-green)`,
                color: "var(--accent-green)",
                cursor: "default",
              }
            : {
                background: activity.color + "20",
                border: `1px solid ${activity.color}60`,
                color: activity.color,
                cursor: "pointer",
              }
        }
      >
        {loading ? <span className="animate-spin text-sm">⟳</span> : done ? "✓" : "○"}
      </button>
    </div>
  );
}
