"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ActivityCard } from "./ActivityCard";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { AchievementToast } from "./AchievementToast";
import { PainelAtributos } from "./PainelAtributos";
import { NotificationSetup } from "./NotificationSetup";
import { computeComboXP } from "@/lib/gamification";
import { getPortrait } from "@/lib/portraits";
import type { Atributos, ClasseInfo } from "@/lib/attributes";

const ATTR_ORDER = ["FOR", "VIT", "AGI", "INT", "PER"] as const;

const ATTR_COLORS: Record<string, string> = {
  FOR: "#f0556a",
  VIT: "#25d99a",
  AGI: "#ffce47",
  INT: "#45cdf0",
  PER: "#8b5cf6",
};

const ATTR_MAX = 20;

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

const BRACKETS = [
  "linear-gradient(to right, var(--accent-violet-bright), var(--accent-violet-bright)) top left / 18px 1.5px no-repeat",
  "linear-gradient(to bottom, var(--accent-violet-bright), var(--accent-violet-bright)) top left / 1.5px 18px no-repeat",
  "linear-gradient(to left, var(--accent-violet-bright), var(--accent-violet-bright)) top right / 18px 1.5px no-repeat",
  "linear-gradient(to bottom, var(--accent-violet-bright), var(--accent-violet-bright)) top right / 1.5px 18px no-repeat",
  "linear-gradient(to right, var(--accent-violet-bright), var(--accent-violet-bright)) bottom left / 18px 1.5px no-repeat",
  "linear-gradient(to top, var(--accent-violet-bright), var(--accent-violet-bright)) bottom left / 1.5px 18px no-repeat",
  "linear-gradient(to left, var(--accent-violet-bright), var(--accent-violet-bright)) bottom right / 18px 1.5px no-repeat",
  "linear-gradient(to top, var(--accent-violet-bright), var(--accent-violet-bright)) bottom right / 1.5px 18px no-repeat",
].join(", ");

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
  const [imgError, setImgError] = useState(false);

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
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-card)",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: "22px",
          alignItems: "center",
          padding: "20px 24px",
          position: "relative",
          overflow: "hidden",
          marginBottom: "20px",
        }}>
          {/* BG radial */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit",
            background: "radial-gradient(90% 80% at 0% 0%, rgba(26,169,214,.11), transparent 55%)" }} />
          {/* Corner brackets */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit",
            backgroundImage: BRACKETS, opacity: .45 }} />

          {/* LEFT: Character */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
            {/* Portrait circle */}
            <div style={{
              width: 72, height: 72, flexShrink: 0, borderRadius: "50%",
              background: `radial-gradient(circle, rgba(26,169,214,.22), transparent 70%), var(--bg-surface)`,
              border: `2px solid var(--accent-violet)`,
              overflow: "hidden", position: "relative",
              boxShadow: `0 0 16px ${portrait.glowColor}`,
            }}>
              {!imgError && (
                <Image
                  key={portrait.src}
                  src={portrait.src}
                  alt={portrait.rank}
                  fill
                  style={{ objectFit: "cover", objectPosition: "50% 12%" }}
                  onError={() => setImgError(true)}
                  priority
                />
              )}
              {imgError && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
                  fontSize: 30, opacity: .4 }}>⚔</div>
              )}
            </div>

            {/* Level ring + info */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                className="level-badge"
                style={{ "--p": progress, width: 46, height: 46 } as React.CSSProperties}
              >
                <span className="lv-label" style={{ fontSize: "7.5px", top: "11px" }}>LV</span>
                <span className="lv-num num" style={{ fontSize: "20px", marginTop: "3px" }}>{level}</span>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "18px", fontWeight: 700,
                  letterSpacing: ".08em", textTransform: "uppercase", lineHeight: 1 }}>
                  Fabricio
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "3px" }}>
                  {portrait.label}
                </div>
                <div style={{
                  display: "inline-flex", marginTop: "5px",
                  background: "rgba(26,169,214,.08)", border: "1px solid rgba(26,169,214,.22)",
                  borderRadius: "4px", padding: "1.5px 8px",
                  fontSize: "9.5px", fontWeight: 700, letterSpacing: ".12em",
                  color: "var(--accent-violet)", fontFamily: "var(--font-space-grotesk)",
                }}>
                  {portrait.rank}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: XP + attributes */}
          <div style={{ padding: "0 22px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", position: "relative" }}>
            {/* XP info */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
              <span>
                <b style={{ color: "var(--text-primary)", fontFamily: "var(--font-space-grotesk)" }}>
                  {levelInfo.totalXP.toLocaleString("pt-BR")}
                </b> XP
              </span>
              <span>
                → LV.{level + 1} faltam{" "}
                <b style={{ color: "var(--accent-violet-bright)" }}>
                  {xpRemaining.toLocaleString("pt-BR")} XP
                </b>{" "}· {progress}%
              </span>
            </div>
            {/* XP bar */}
            <div className="xp-track" style={{ height: "7px", marginBottom: "16px" }}>
              <div
                className={`xp-fill${nearLevel ? " near-level" : ""}`}
                style={{ "--xp": `${progress}%` } as React.CSSProperties}
              />
            </div>
            {/* Attribute mini-bars */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", textAlign: "center" }}>
              {ATTR_ORDER.map((k) => {
                const val = atributos[k] ?? 0;
                const pct = Math.round((Math.min(val, ATTR_MAX) / ATTR_MAX) * 100);
                const color = ATTR_COLORS[k];
                return (
                  <div key={k}>
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "10px", fontWeight: 700, color, marginBottom: "3px" }}>{k}</div>
                    <div style={{ height: "3px", borderRadius: "999px", background: "var(--border)", overflow: "hidden", marginBottom: "4px" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color }} />
                    </div>
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "13px", fontWeight: 700,
                      color: val > 0 ? color : "var(--text-muted)" }}>{val}</div>
                  </div>
                );
              })}
            </div>
            {/* XP hoje */}
            {xpToday > 0 && (
              <div style={{ position: "absolute", top: 0, right: "22px", textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "15px", fontWeight: 700,
                  color: "var(--text-primary)", letterSpacing: ".02em" }}>+{xpToday}</div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: ".16em",
                  textTransform: "uppercase", fontWeight: 700 }}>XP HOJE</div>
              </div>
            )}
          </div>

          {/* RIGHT: Next level + week */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "10px", padding: "11px 14px" }}>
              <div style={{ fontSize: "9px", letterSpacing: ".18em", textTransform: "uppercase",
                color: "var(--text-muted)", fontWeight: 700, marginBottom: "4px" }}>Próximo nível</div>
              <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "20px", fontWeight: 700, lineHeight: 1,
                color: "var(--text-primary)" }}>LV.{level + 1}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "3px" }}>
                faltam <b style={{ color: "var(--accent-violet-bright)" }}>{xpRemaining.toLocaleString("pt-BR")} XP</b>
              </div>
            </div>
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "10px", padding: "11px 14px" }}>
              <div style={{ fontSize: "9px", letterSpacing: ".18em", textTransform: "uppercase",
                color: "var(--text-muted)", fontWeight: 700, marginBottom: "8px" }}>Esta semana</div>
              <div style={{ display: "flex", gap: "3px" }}>
                {weekDays.map((d, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                    <div style={{
                      width: "21px", height: "21px", borderRadius: "5px",
                      background: d.hasCheckin
                        ? (d.isToday ? "rgba(69,205,240,.2)" : "rgba(37,217,154,.12)")
                        : "var(--bg-surface)",
                      border: d.isToday
                        ? "1px solid rgba(69,205,240,.6)"
                        : d.hasCheckin ? "1px solid rgba(37,217,154,.35)" : "1px solid var(--border)",
                      display: "grid", placeItems: "center",
                      fontSize: "9px",
                      color: d.hasCheckin ? (d.isToday ? "var(--accent-violet-bright)" : "#25d99a") : "transparent",
                      boxShadow: d.isToday ? "0 0 7px rgba(69,205,240,.2)" : "none",
                    }}>
                      {d.hasCheckin ? "✓" : ""}
                    </div>
                    <span style={{ fontSize: "8px",
                      color: d.isToday ? "var(--accent-violet-bright)" : "var(--text-muted)",
                      fontFamily: "var(--font-space-grotesk)", fontWeight: d.isToday ? 700 : 400 }}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Missions ── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "13px" }}>
          <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "16px", fontWeight: 700, margin: 0 }}>
            Missões de hoje
          </h2>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            <b style={{ color: "var(--text-primary)", fontFamily: "var(--font-space-grotesk)" }}>{doneCount}</b>
            {" / "}{initialActivities.length} concluídas
          </div>
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

            <div className="act-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "stretch" }}>
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
