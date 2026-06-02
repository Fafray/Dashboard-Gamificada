"use client";

import { useState, useCallback, useEffect } from "react";
import { ActivityCard } from "./ActivityCard";
import { HeroSection } from "./HeroSection";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { AchievementToast } from "./AchievementToast";
import { PainelAtributos } from "./PainelAtributos";
import { PainelStatus } from "./PainelStatus";
import { MissaoDoSistema } from "./MissaoDoSistema";
import { computeComboXP } from "@/lib/gamification";
import type { Atributos, ClasseInfo } from "@/lib/attributes";

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
  const [levelUpLevel, setLevelUpLevel]   = useState<number | null>(null);
  const [bonusAwarded, setBonusAwarded]   = useState(false);
  const [bonusPop, setBonusPop]           = useState<number | null>(null);

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

  const comboXp = computeComboXP(atributos.AGI ?? 0);

  // Award daily completion bonus once when all activities are done
  useEffect(() => {
    if (!allDone || bonusAwarded) return;
    setBonusAwarded(true);
    setXpToday((prev) => prev + comboXp);
    setBonusPop(comboXp);
    setTimeout(() => setBonusPop(null), 1200);
  }, [allDone, bonusAwarded, comboXp]);

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

        {/* Status do dia */}
        <div className="section">
          <PainelStatus
            maxStreak={maxStreak}
            doneCount={doneCount}
            totalCount={totalCount}
            totalXP={levelInfo.totalXP}
          />
        </div>

        {/* Atributos */}
        <div className="section">
          <PainelAtributos
            initialAtributos={atributos}
            initialPontos={pontosDisponiveis}
            initialClasse={classeInfo}
            onClasseChange={setClasseInfo}
          />
        </div>

        {/* Missão do Sistema */}
        {totalCount > 0 && (
          <div className="section">
            <MissaoDoSistema
              doneCount={doneCount}
              totalCount={totalCount}
              comboXp={comboXp}
            />
          </div>
        )}

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
                  atributos={atributos}
                  onCheckin={(result) => handleCheckin(activity.id, result)}
                  onUndo={(result) => handleUndo(activity.id, result)}
                />
              ))}
            </div>
          )}
        </div>

        {/* XP pop quando todas as missões são concluídas */}
        {bonusPop !== null && (
          <div
            className="bonus-pop go"
            style={{ position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}
          >
            ⚡ +{bonusPop} XP combo!
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
