"use client";

import { useState, useCallback } from "react";
import { ActivityCard } from "./ActivityCard";
import { HeroSection } from "./HeroSection";
import { LevelUpOverlay } from "./LevelUpOverlay";
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
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [doneSet, setDoneSet] = useState<Set<number>>(
    () => new Set(initialActivities.filter((a) => a.doneToday).map((a) => a.id))
  );

  const handleCheckin = useCallback((activityId: number, result: CheckinResult) => {
    setDoneSet((prev) => new Set([...prev, activityId]));
    setLevelInfo((prev) => {
      if (result.levelInfo.level > prev.level) {
        setLevelUpLevel(result.levelInfo.level);
      }
      return result.levelInfo;
    });
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

  const maxStreak = initialActivities.reduce((m, a) => Math.max(m, a.streak.current), 0);
  const nonFreeActivities = initialActivities.filter((a) => a.frequency !== "free");
  const doneCount = nonFreeActivities.filter((a) => doneSet.has(a.id)).length;
  const totalCount = nonFreeActivities.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  return (
    <>
      {levelUpLevel !== null && (
        <LevelUpOverlay
          show
          mode="levelup"
          level={levelUpLevel}
          onClose={() => setLevelUpLevel(null)}
        />
      )}

      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievements={pendingAchievements}
          onDismiss={() => setPendingAchievements([])}
        />
      )}

      <div className="page">
        {/* Cabeçalho da página */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <div>
            <p className="eyebrow">Dashboard</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
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

        {/* Hero: nível + XP */}
        <HeroSection levelInfo={levelInfo} xpToday={xpToday} />

        {/* Atividades */}
        <div className="section">
          <div className="section-head">
            <h2>Atividades de Hoje</h2>
          </div>

          {initialActivities.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="act-grid">
              {initialActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={{
                    ...activity,
                    doneToday: doneSet.has(activity.id),
                  }}
                  onCheckin={(result) => handleCheckin(activity.id, result)}
                  onUndo={(result) => handleUndo(activity.id, result)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Banner de missão completa */}
        {allDone && (
          <div className="section">
            <div
              className="card"
              style={{
                padding: "24px",
                textAlign: "center",
                background: "linear-gradient(160deg, rgba(47,224,166,.12), rgba(47,224,166,.03))",
                borderColor: "rgba(47,224,166,.4)",
              }}
            >
              <p style={{ fontSize: "30px", marginBottom: "8px" }}>🏆</p>
              <p style={{ fontWeight: 700, color: "var(--accent-green)", fontSize: "15px", marginBottom: "4px" }}>
                Todas as atividades concluídas!
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                +{xpToday} XP ganhos hoje
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="card" style={{ padding: "40px", textAlign: "center" }}>
      <p style={{ fontSize: "40px", marginBottom: "12px" }}>⚔️</p>
      <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
        Nenhuma atividade ainda
      </p>
      <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        Adicione suas primeiras atividades para começar a ganhar XP
      </p>
    </div>
  );
}
