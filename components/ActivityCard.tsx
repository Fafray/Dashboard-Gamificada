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

const FREQ_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal", free: "Livre" };

export function ActivityCard({ activity, onCheckin, onUndo }: ActivityCardProps) {
  const [done, setDone] = useState(activity.doneToday);
  const [checkinId, setCheckinId] = useState<number | null>(activity.todayCheckinId);
  const [streak, setStreak] = useState(activity.streak.current);
  const [loading, setLoading] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [xpPops, setXpPops] = useState<{ id: number; text: string }[]>([]);
  const [milestoneFiring, setMilestoneFiring] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  function addXpPop(xp: number, newStreak: number): void {
    const milestone = getStreakMilestone(newStreak);
    const text = milestone
      ? `+${xp} XP ${milestone.emoji}`
      : `+${xp} XP`;
    const id = Date.now();
    setXpPops((prev) => [...prev, { id, text }]);
    setTimeout(() => setXpPops((prev) => prev.filter((x) => x.id !== id)), 1100);
    if (milestone) {
      setMilestoneFiring(true);
      setTimeout(() => setMilestoneFiring(false), 700);
    }
  }

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
    if (!done || !checkinId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checkins/${checkinId}`, { method: "DELETE" });
      if (!res.ok) return;
      const result: UndoResult = await res.json();
      setDone(false);
      setCheckinId(null);
      setStreak((s) => Math.max(0, s - 1));
      onUndo(result);
    } finally {
      setLoading(false);
    }
  }

  const milestone = getStreakMilestone(streak);

  return (
    <div
      ref={cardRef}
      className={`act${done ? " done" : ""}${justDone ? " justdone" : ""}`}
    >
      <div className="pulse-ring" />

      {xpPops.map((pop) => (
        <div key={pop.id} className="xp-pop go">
          {pop.text}
        </div>
      ))}

      <div className="act-head">
        <div
          className="act-emoji"
          style={{ borderColor: done ? "rgba(47,224,166,.4)" : undefined }}
        >
          {activity.emoji || "⚡"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="act-name">{activity.name}</div>
          <div className="act-freq">
            <span className="freq-dot" />
            {FREQ_LABEL[activity.frequency]}
          </div>
        </div>
        {streak > 0 && (
          <div className={`act-streak${milestoneFiring ? " streak-milestone" : ""}`}>
            <span style={{ animation: "flicker 2.4s ease-in-out infinite" }}>🔥</span>
            <span className="num">{streak}</span>
            {milestone && (
              <span style={{ fontSize: "11px", color: "var(--accent-gold)", marginLeft: "3px" }}>
                {milestone.emoji}
              </span>
            )}
          </div>
        )}
      </div>

      {milestone && streak > 0 && (
        <div
          style={{
            margin: "10px 0 0",
            padding: "6px 10px",
            borderRadius: "8px",
            background: "rgba(247,183,51,.12)",
            border: "1px solid rgba(247,183,51,.3)",
            fontSize: "11.5px",
            color: "var(--accent-gold)",
            fontWeight: 600,
          }}
        >
          {milestone.emoji} {milestone.name} — {streak} dias seguidos!
        </div>
      )}

      <div className="act-foot">
        <button
          className="btn-checkin"
          onClick={handleCheckin}
          disabled={done || loading}
        >
          {loading ? "..." : done ? "✓ Concluído hoje" : "Fazer check-in"}
        </button>

        {done && checkinId && (
          <button className="btn-undo" onClick={handleUndo} title="Desfazer check-in">
            ↩
          </button>
        )}
      </div>
    </div>
  );
}
