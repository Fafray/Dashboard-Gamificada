"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ActivityCard } from "./ActivityCard";
import { CharPortrait } from "./HeroSection";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { AchievementToast } from "./AchievementToast";
import { PainelAtributos } from "./PainelAtributos";
import { NotificationSetup } from "./NotificationSetup";
import { computeComboXP } from "@/lib/gamification";
import { getPortrait } from "@/lib/portraits";
import type { Atributos, ClasseInfo } from "@/lib/attributes";

const CATEGORIA_COR: Record<string, string> = {
  saude:      "#25d99a",
  treino:     "#f0556a",
  estudo:     "#45cdf0",
  disciplina: "#ffce47",
  foco:       "#8b5cf6",
};

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

  const maxStreak = initialActivities.reduce((m, a) => Math.max(m, a.streak.current), 0);
  const nonFreeActivities = initialActivities.filter((a) => a.frequency !== "free");
  const dailyActivities   = initialActivities.filter((a) => a.frequency === "daily");
  const dailyDoneCount    = dailyActivities.filter((a) => doneSet.has(a.id)).length;
  const allDone           = nonFreeActivities.length > 0 && nonFreeActivities.every((a) => doneSet.has(a.id));
  const comboXp           = computeComboXP(atributos.AGI ?? 0);

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

  // greeting based on time
  const hour = new Date().getHours();
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>
              {greeting}, Fabricio
            </h1>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px", letterSpacing: ".04em" }}>
              {dateLabel}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {maxStreak > 0 && (
              <div className="chip streak">
                <span className="flame">🔥</span>
                <b className="num">{maxStreak}</b>
                <span>dias</span>
              </div>
            )}
            {dailyActivities.length > 0 && (
              <div className="chip">
                <span className="num">{dailyDoneCount}</span>
                <span>/{dailyActivities.length} diárias</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3-column grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 220px",
          gap: "20px",
          alignItems: "start",
        }}>

          {/* ── LEFT: Character + Attributes ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Character card */}
            <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              {/* Corner brackets */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
                backgroundImage: [
                  "linear-gradient(to right, var(--accent-violet-bright), var(--accent-violet-bright)) top left / 14px 1.5px no-repeat",
                  "linear-gradient(to bottom, var(--accent-violet-bright), var(--accent-violet-bright)) top left / 1.5px 14px no-repeat",
                  "linear-gradient(to left, var(--accent-violet-bright), var(--accent-violet-bright)) top right / 14px 1.5px no-repeat",
                  "linear-gradient(to bottom, var(--accent-violet-bright), var(--accent-violet-bright)) top right / 1.5px 14px no-repeat",
                  "linear-gradient(to right, var(--accent-violet-bright), var(--accent-violet-bright)) bottom left / 14px 1.5px no-repeat",
                  "linear-gradient(to top, var(--accent-violet-bright), var(--accent-violet-bright)) bottom left / 1.5px 14px no-repeat",
                  "linear-gradient(to left, var(--accent-violet-bright), var(--accent-violet-bright)) bottom right / 14px 1.5px no-repeat",
                  "linear-gradient(to top, var(--accent-violet-bright), var(--accent-violet-bright)) bottom right / 1.5px 14px no-repeat",
                ].join(", "),
                opacity: .55,
              }} />

              {/* Portrait */}
              <div style={{ height: "180px", position: "relative" }}>
                <CharPortrait level={level} classeCor={classeInfo.cor} />
              </div>

              {/* Level ring + rank + XP bar */}
              <div style={{ padding: "14px 16px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  {/* Level ring */}
                  <div
                    className="level-badge"
                    style={{ "--p": progress, width: 52, height: 52 } as React.CSSProperties}
                  >
                    <span className="lv-label" style={{ fontSize: "7px", top: "10px" }}>LV</span>
                    <span className="lv-num num" style={{ fontSize: "22px", marginTop: "3px" }}>{level}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: "14px", letterSpacing: ".08em", color: "var(--accent-violet-bright)" }}>
                      {portrait.rank}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {levelInfo.totalXP.toLocaleString("pt-BR")} XP
                    </div>
                  </div>
                  {xpToday > 0 && (
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "15px", fontWeight: 700, color: "var(--accent-gold)" }}>
                        +{xpToday}
                      </div>
                      <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: ".1em", textTransform: "uppercase" }}>hoje</div>
                    </div>
                  )}
                </div>

                {/* XP bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)", marginBottom: "5px" }}>
                    <span>{currentLevelXP.toLocaleString("pt-BR")} XP</span>
                    <span className="num">{nearLevel ? `⚡ ${xpRemaining} restantes` : `→ LV.${level + 1}`}</span>
                  </div>
                  <div className="xp-track" style={{ height: "10px" }}>
                    <div
                      className={`xp-fill${nearLevel ? " near-level" : ""}`}
                      style={{ "--xp": `${progress}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes card */}
            <PainelAtributos
              initialAtributos={atributos}
              initialPontos={pontosDisponiveis}
              initialClasse={classeInfo}
              onClasseChange={setClasseInfo}
              compact
            />
          </div>

          {/* ── CENTER: Missions ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "16px" }}>Missões de hoje</h2>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ color: "var(--accent-violet-bright)", fontWeight: 700 }}>{dailyDoneCount}</span>
                {" / "}{dailyActivities.length} concluídas
              </span>
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
                {/* All-done banner */}
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

                <div className="act-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  {initialActivities
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

            {/* Notification setup — below missions, center col */}
            <div style={{ marginTop: "20px" }}>
              <NotificationSetup />
            </div>
          </div>

          {/* ── RIGHT: Level / Week / Agenda ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Próximo nível */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                Próximo nível
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "10px" }}>
                <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "22px", fontWeight: 700, color: "var(--accent-violet-bright)" }}>
                  LV.{level + 1}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>faltam</span>
                <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {xpRemaining.toLocaleString("pt-BR")} XP
                </span>
              </div>
              <div className="xp-track" style={{ height: "8px" }}>
                <div
                  className={`xp-fill${nearLevel ? " near-level" : ""}`}
                  style={{ "--xp": `${progress}%` } as React.CSSProperties}
                />
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px", textAlign: "right" }}>
                {progress}%
              </div>
            </div>

            {/* Esta semana */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>
                Esta semana
              </div>
              <div style={{ display: "flex", gap: "5px", justifyContent: "space-between" }}>
                {weekDays.map((d, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                    <div style={{
                      width: "26px", height: "26px", borderRadius: "7px",
                      background: d.hasCheckin
                        ? d.isToday ? "var(--accent-violet)" : "rgba(26,169,214,.35)"
                        : d.isToday ? "rgba(26,169,214,.12)" : "var(--bg-surface)",
                      border: d.isToday
                        ? "1px solid var(--accent-violet-bright)"
                        : d.hasCheckin ? "1px solid rgba(26,169,214,.4)" : "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px",
                      transition: "background .2s",
                    }}>
                      {d.hasCheckin ? "✓" : ""}
                    </div>
                    <span style={{ fontSize: "9px", color: d.isToday ? "var(--accent-violet-bright)" : "var(--text-muted)", fontFamily: "var(--font-space-grotesk)", fontWeight: d.isToday ? 700 : 400 }}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda de hoje */}
            {todayTasks.length > 0 && (
              <div className="card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Agenda
                  </div>
                  <Link href="/agenda" style={{ fontSize: "10px", color: "var(--accent-teal)", textDecoration: "none", letterSpacing: ".06em" }}>
                    Ver tudo →
                  </Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {todayTasks.slice(0, 4).map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px" }}>{t.emoji ?? "📌"}</span>
                      <span style={{
                        flex: 1, fontSize: "12px", fontWeight: 600,
                        color: "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {t.name}
                      </span>
                      {t.due_time && (
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>{t.due_time}</span>
                      )}
                    </div>
                  ))}
                  {todayTasks.length > 4 && (
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                      +{todayTasks.length - 4} mais
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Link para conquistas */}
            <Link href="/achievements" style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "14px 16px", cursor: "pointer", transition: "border-color .15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,206,71,.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
              >
                <div style={{ fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Títulos
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>🏅</span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Ver trilhas e conquistas →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Mobile fallback: responsive collapse ── */}
        <style>{`
          @media (max-width: 900px) {
            .dash-3col { grid-template-columns: 1fr !important; }
          }
        `}</style>

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
