"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ActivityCard } from "./ActivityCard";
import { HeroSection } from "./HeroSection";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { AchievementToast } from "./AchievementToast";
import { PainelAtributos } from "./PainelAtributos";
import { getDailyCompletionBonus } from "@/lib/gamification";
import type { Atributos, ClasseInfo } from "@/lib/attributes";

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
  atributos: Atributos;
  pontosDisponiveis: number;
  classeInfo: ClasseInfo;
}

export function DashboardClient({
  activities: initialActivities,
  levelInfo: initialLevelInfo,
  xpToday: initialXpToday,
  dateLabel,
  atributos,
  pontosDisponiveis,
  classeInfo: initialClasse,
}: DashboardClientProps) {
  const [classeInfo, setClasseInfo] = useState(initialClasse);
  const [levelInfo, setLevelInfo] = useState(initialLevelInfo);
  const [xpToday, setXpToday] = useState(initialXpToday);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [bonusAwarded, setBonusAwarded] = useState(false);
  const [bonusPop, setBonusPop] = useState<number | null>(null);
  const allDoneBannerRef = useRef<HTMLDivElement>(null);

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

  // Award daily completion bonus once when all activities are done
  useEffect(() => {
    if (!allDone || bonusAwarded) return;
    const bonus = getDailyCompletionBonus(totalCount);
    if (bonus <= 0) return;
    setBonusAwarded(true);
    setXpToday((prev) => prev + bonus);
    setBonusPop(bonus);
    setTimeout(() => setBonusPop(null), 1200);
  }, [allDone, bonusAwarded, totalCount]);

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
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <p className="eyebrow">[ PAINEL DO SISTEMA ]</p>
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

        {/* Hero */}
        <HeroSection levelInfo={levelInfo} xpToday={xpToday} classeCor={classeInfo.cor} />

        {/* Atributos */}
        <div className="section">
          <PainelAtributos
            initialAtributos={atributos}
            initialPontos={pontosDisponiveis}
            initialClasse={classeInfo}
            onClasseChange={setClasseInfo}
          />
        </div>

        {/* Missões */}
        <div className="section">
          <div className="section-head">
            <h2>Missões do Dia</h2>
          </div>

          {initialActivities.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="act-grid">
              {initialActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={{ ...activity, doneToday: doneSet.has(activity.id) }}
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
              ref={allDoneBannerRef}
              className="card all-done-banner"
              style={{
                padding: "28px",
                textAlign: "center",
                background: "linear-gradient(160deg, rgba(0,150,200,.14), rgba(0,80,180,.03))",
                borderColor: "rgba(0,180,232,.4)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {bonusPop !== null && (
                <div
                  className="bonus-pop go"
                  style={{ left: "50%", top: "12px", transform: "translateX(-50%)" }}
                >
                  🎯 +{bonusPop} XP bônus!
                </div>
              )}
              <p style={{ fontSize: "32px", marginBottom: "10px" }}>🏆</p>
              <p style={{ fontWeight: 700, color: "var(--accent-violet-bright)", fontSize: "15px", marginBottom: "4px", letterSpacing: ".1em", fontFamily: "var(--font-space-grotesk), sans-serif", textTransform: "uppercase", textShadow: "0 0 20px rgba(0,180,232,.5)" }}>
                ✓ Todas as Missões Concluídas
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", letterSpacing: ".04em" }}>
                +{xpToday} XP GANHOS HOJE
                {bonusAwarded && (
                  <span style={{ color: "var(--accent-teal)", marginLeft: "6px" }}>
                    (inclui bônus de conclusão 🎯)
                  </span>
                )}
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
      <p style={{ fontSize: "40px", marginBottom: "12px" }}>◈</p>
      <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", letterSpacing: ".1em", fontFamily: "var(--font-space-grotesk), sans-serif", textTransform: "uppercase" }}>
        Nenhuma Missão Registrada
      </p>
      <p style={{ fontSize: "12.5px", color: "var(--text-muted)", letterSpacing: ".04em" }}>
        Registre suas primeiras missões para iniciar sua jornada
      </p>
    </div>
  );
}
