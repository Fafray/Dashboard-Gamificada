"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ActivityCard } from "./ActivityCard";
import { HeroBand } from "./HeroBand";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { AchievementToast } from "./AchievementToast";
import { PainelAtributos } from "./PainelAtributos";
import { NotificationSetup } from "./NotificationSetup";
import { computeComboXP } from "@/lib/gamification";
import { getPortrait } from "@/lib/portraits";
import type { Atributos, ClasseInfo } from "@/lib/attributes";

interface TodayTask {
  id: number;
  name: string;
  emoji: string | null;
  due_date: string;
  due_time: string | null;
  category: string | null;
}

interface WeekDay {
  label: string;
  hasCheckin: boolean;
  isToday: boolean;
}

interface Activity {
  id: number;
  name: string;
  frequency: "daily" | "weekly" | "free" | "nx_week" | "once";
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
  todayCheckinValue: number | null;
  micro_version: string | null;
  anchor_context: string | null;
  is_keystone: boolean;
  graduation_count: number;
  scheduled_days: string | null;
  due_date: string | null;
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
  bonusMissionId: number | null;
  todayTasks: TodayTask[];
  weekDays: WeekDay[];
}


export function DashboardClient({
  activities: initialActivities,
  levelInfo: initialLevelInfo,
  xpToday: initialXpToday,
  dateLabel,
  atributos,
  pontosDisponiveis,
  classeInfo: initialClasse,
  bonusMissionId,
  todayTasks,
  weekDays,
}: DashboardClientProps) {
  const [classeInfo, setClasseInfo] = useState(initialClasse);
  const [levelInfo, setLevelInfo] = useState(initialLevelInfo);
  const [xpToday, setXpToday] = useState(initialXpToday);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [bonusAwarded, setBonusAwarded] = useState(false);
  const [bonusPop, setBonusPop] = useState<number | null>(null);
  const [filter, setFilter] = useState<"todos" | "daily" | "nx_week" | "weekly">("todos");

  const [doneSet, setDoneSet] = useState<Set<number>>(
    () => new Set(initialActivities.filter((a) => a.doneToday).map((a) => a.id))
  );

  const handleCheckin = useCallback((activityId: number, result: CheckinResult) => {
    setDoneSet((prev) => new Set([...prev, activityId]));
    setLevelInfo((prev) => {
      if (result.levelInfo.level > prev.level) setLevelUpLevel(result.levelInfo.level);
      return result.levelInfo;
    });
    setXpToday((prev) => prev + result.xpEarned);
    if (result.newlyUnlocked.length > 0) setPendingAchievements(result.newlyUnlocked);
  }, []);

  const handleUndo = useCallback((activityId: number, result: UndoResult) => {
    setDoneSet((prev) => { const n = new Set(prev); n.delete(activityId); return n; });
    setLevelInfo(result.levelInfo);
    setXpToday((prev) => Math.max(0, prev - result.xpSubtracted));
  }, []);

  const maxStreak       = initialActivities.reduce((m, a) => Math.max(m, a.streak.current), 0);
  const nonFree         = initialActivities.filter((a) => a.frequency !== "free");
  const dailyActivities = initialActivities.filter((a) => a.frequency === "daily");
  const dailyDoneCount  = dailyActivities.filter((a) => doneSet.has(a.id)).length;
  const doneCount       = initialActivities.filter((a) => doneSet.has(a.id)).length;
  const allDone         = nonFree.length > 0 && nonFree.every((a) => doneSet.has(a.id));
  const comboXp         = computeComboXP(atributos.AGI ?? 0);

  useEffect(() => {
    if (!allDone || bonusAwarded) return;
    setBonusAwarded(true);
    setXpToday((prev) => prev + comboXp);
    setBonusPop(comboXp);
    setTimeout(() => setBonusPop(null), 1200);
  }, [allDone, bonusAwarded, comboXp]);

  const { level, currentLevelXP, nextLevelXP, progress } = levelInfo;
  const xpRemaining = nextLevelXP - currentLevelXP;
  const nearLevel   = progress >= 80;
  const portrait    = getPortrait(level);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      {levelUpLevel !== null && (
        <LevelUpOverlay show mode="levelup" level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
      )}
      {pendingAchievements.length > 0 && (
        <AchievementToast achievements={pendingAchievements} onDismiss={() => setPendingAchievements([])} />
      )}

      <div className="page">

        {/* ── Topbar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "21px", fontWeight: 700, margin: 0 }}>
              {greeting}, Fabricio
            </h1>
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "3px" }}>{dateLabel}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {maxStreak > 0 && (
              <div className="chip streak">
                <span className="flame">🔥</span>
                <b className="num">{maxStreak}</b>
                <span>dias</span>
              </div>
            )}
            {dailyActivities.length > 0 && (
              <div className="chip">
                <b className="num">{dailyDoneCount}</b>
                <span>/{dailyActivities.length} diárias</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Hero Band ── */}
        <HeroBand
          level={level}
          progress={progress}
          xpTotal={levelInfo.totalXP}
          xpRemaining={xpRemaining}
          rank={portrait.rank}
          classeLabel={portrait.label}
          portraitSrc={portrait.src}
          portraitGlow={portrait.glowColor}
          atributos={atributos}
          weekDays={weekDays}
          xpToday={xpToday}
          nearLevel={nearLevel}
        />

        {/* ── Missions ── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "10px" }}>
          <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "16px", fontWeight: 700, margin: 0 }}>
            Missões de hoje
          </h2>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            <b style={{ color: "var(--text-primary)", fontFamily: "var(--font-space-grotesk)" }}>{doneCount}</b>
            {" / "}{initialActivities.length} concluídas
          </div>
        </div>

        {/* Filtros de frequência */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {(["todos", "daily", "nx_week", "weekly"] as const).map((key) => {
            const label = key === "todos" ? "Todos" : key === "daily" ? "Diário" : key === "nx_week" ? "N×/sem." : "Semanal";
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "4px 12px", borderRadius: 6, fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  border: active ? "1px solid rgba(69,205,240,.5)" : "1px solid var(--border)",
                  background: active ? "rgba(69,205,240,.1)" : "transparent",
                  color: active ? "var(--accent-violet-bright)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {initialActivities.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ fontSize: "36px", marginBottom: "12px" }}>◈</p>
            <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", fontFamily: "var(--font-space-grotesk)" }}>
              Nenhuma missão registrada
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Acesse Missões para criar suas atividades
            </p>
          </div>
        ) : (
          <>
            {allDone && (
              <div className="all-done-banner" style={{
                marginBottom: "12px", padding: "10px 14px", borderRadius: "10px",
                background: "rgba(37,217,154,.07)", border: "1px solid rgba(37,217,154,.4)",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                <span style={{ fontSize: "16px" }}>⚡</span>
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: ".14em", fontWeight: 700, color: "#25d99a", textTransform: "uppercase" }}>Dia Perfeito</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "1px" }}>
                    Todas concluídas · combo <b style={{ color: "#25d99a" }}>+{comboXp} XP</b>
                  </div>
                </div>
              </div>
            )}

            <div className="act-grid" style={{ alignItems: "start" }}>
              {initialActivities
                .filter((a) => filter === "todos" || a.frequency === filter)
                .sort((a, b) => (doneSet.has(a.id) ? 1 : 0) - (doneSet.has(b.id) ? 1 : 0))
                .map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={{ ...activity, doneToday: doneSet.has(activity.id) }}
                    atributos={atributos}
                    isBonusMission={bonusMissionId !== null && activity.id === bonusMissionId}
                    onCheckin={(result) => handleCheckin(activity.id, result)}
                    onUndo={(result) => handleUndo(activity.id, result)}
                    initialAccumulated={activity.todayCheckinValue}
                  />
                ))}
            </div>
          </>
        )}

        {/* Notification setup */}
        <div style={{ marginTop: "20px" }}>
          <NotificationSetup />
        </div>

        {/* Agenda today */}
        {todayTasks.length > 0 && (
          <div className="card" style={{ padding: "14px 16px", marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
                Agenda de hoje
              </div>
              <Link href="/agenda" style={{ fontSize: "10px", color: "var(--accent-teal)", textDecoration: "none", letterSpacing: ".06em" }}>
                Ver tudo →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
              {todayTasks.slice(0, 4).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px",
                  background: "var(--bg-surface)", borderRadius: "8px", padding: "8px 10px" }}>
                  <span style={{ fontSize: "14px" }}>{t.emoji ?? "📌"}</span>
                  <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.name}
                  </span>
                  {t.due_time && (
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>{t.due_time}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attributes panel */}
        <div style={{ marginTop: "20px" }}>
          <PainelAtributos
            initialAtributos={atributos}
            initialPontos={pontosDisponiveis}
            initialClasse={classeInfo}
            onClasseChange={setClasseInfo}
          />
        </div>

        {/* Titles link */}
        <div style={{ marginTop: "14px" }}>
          <Link href="/achievements" style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: "14px 16px", cursor: "pointer", transition: "border-color .15s",
              display: "flex", alignItems: "center", gap: "10px" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,206,71,.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <span style={{ fontSize: "20px" }}>🏅</span>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
                  Títulos
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Ver trilhas e conquistas →
                </div>
              </div>
            </div>
          </Link>
        </div>

      </div>

      {bonusPop !== null && (
        <div className="bonus-pop go" style={{ position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
          ⚡ +{bonusPop} XP combo!
        </div>
      )}
    </>
  );
}
