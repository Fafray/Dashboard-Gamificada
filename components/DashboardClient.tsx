"use client";

import { useState, useCallback } from "react";
import { ActivityCard } from "./ActivityCard";
import { XPBar } from "./XPBar";
import { AchievementToast } from "./AchievementToast";

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

interface LevelInfo {
  level: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
}

interface Achievement {
  key: string;
  name: string;
  description: string;
  emoji: string;
}

interface CheckinResult {
  checkin: { id: number; xp_earned: number };
  xpEarned: number;
  newStreak: number;
  levelInfo: LevelInfo;
  newlyUnlocked: Achievement[];
}

interface UndoResult {
  xpSubtracted: number;
  levelInfo: LevelInfo;
}

interface DashboardClientProps {
  activities: Activity[];
  levelInfo: LevelInfo;
  xpToday: number;
  dateLabel: string;
}

export function DashboardClient({
  activities: initialActivities,
  levelInfo: initialLevelInfo,
  xpToday: initialXpToday,
  dateLabel,
}: DashboardClientProps) {
  const [levelInfo, setLevelInfo] = useState(initialLevelInfo);
  const [xpToday, setXpToday] = useState(initialXpToday);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  // Track which activities are done in this session
  const [doneSet, setDoneSet] = useState<Set<number>>(
    () => new Set(initialActivities.filter((a) => a.doneToday).map((a) => a.id))
  );

  const handleCheckin = useCallback((activityId: number, result: CheckinResult) => {
    setDoneSet((prev) => new Set([...prev, activityId]));
    setLevelInfo(result.levelInfo);
    setXpToday((prev) => prev + result.xpEarned);
    if (result.newlyUnlocked.length > 0) {
      setPendingAchievements(result.newlyUnlocked);
    }
  }, []);

  const handleUndo = useCallback((activityId: number, result: UndoResult) => {
    setDoneSet((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });
    setLevelInfo(result.levelInfo);
    setXpToday((prev) => Math.max(0, prev - result.xpSubtracted));
  }, []);

  const nonFreeActivities = initialActivities.filter((a) => a.frequency !== "free");
  const doneCount = nonFreeActivities.filter((a) => doneSet.has(a.id)).length;
  const totalCount = nonFreeActivities.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievements={pendingAchievements}
          onDismiss={() => setPendingAchievements([])}
        />
      )}

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Daily Quest
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {dateLabel}
            </p>
          </div>
          {totalCount > 0 && (
            <div
              className="text-sm font-medium px-3 py-1.5 rounded-lg"
              style={{
                background: allDone ? "var(--accent-green)" + "20" : "var(--bg-card)",
                color: allDone ? "var(--accent-green)" : "var(--text-secondary)",
                border: `1px solid ${allDone ? "var(--accent-green)" : "var(--border)"}`,
              }}
            >
              {doneCount}/{totalCount} feitos
            </div>
          )}
        </div>

        {/* XP Bar */}
        <XPBar
          level={levelInfo.level}
          currentLevelXP={levelInfo.currentLevelXP}
          nextLevelXP={levelInfo.nextLevelXP}
          progress={levelInfo.progress}
          totalXP={levelInfo.totalXP}
          xpToday={xpToday}
        />

        {/* Activities */}
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Atividades de Hoje
          </h2>

          {initialActivities.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {initialActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onCheckin={(result) => handleCheckin(activity.id, result)}
                  onUndo={(result) => handleUndo(activity.id, result)}
                />
              ))}
            </div>
          )}
        </div>

        {/* All done banner */}
        {allDone && (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: "var(--accent-green)" + "10",
              border: "1px solid " + "var(--accent-green)" + "40",
            }}
          >
            <p className="text-lg mb-1">🏆</p>
            <p className="font-semibold text-sm" style={{ color: "var(--accent-green)" }}>
              Todas as atividades concluídas!
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              +{xpToday} XP ganhos hoje
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="text-4xl mb-3">⚔️</p>
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Nenhuma atividade ainda
      </p>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Adicione suas primeiras atividades para começar a ganhar XP
      </p>
    </div>
  );
}
