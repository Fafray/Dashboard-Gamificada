"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ActivityCard } from "./ActivityCard";
import { HeroXPCard, HeroCharCard, getLevelTitle } from "./HeroSection";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { AchievementToast } from "./AchievementToast";
import { PainelAtributos } from "./PainelAtributos";
import { PainelStatus } from "./PainelStatus";
import { MissaoDoSistema } from "./MissaoDoSistema";
import { NotificationSetup } from "./NotificationSetup";
import { computeComboXP } from "@/lib/gamification";
import { CATEGORIA_ATRIBUTO, CATEGORIA_LABELS } from "@/lib/attributes";
import type { Atributos, ClasseInfo } from "@/lib/attributes";

const CATEGORIA_COR: Record<string, string> = {
  saude: "#25d99a", treino: "#f0556a", estudo: "#45cdf0", disciplina: "#ffce47", foco: "#8b5cf6",
};
const COR_ATTR: Record<string, string> = {
  FOR: "#f0556a", VIT: "#25d99a", AGI: "#ffce47", INT: "#8b5cf6", PER: "#45cdf0",
};
const CATEGORIAS_ORDEM = ["saude", "treino", "estudo", "disciplina", "foco"] as const;
const SEM_CATEGORIA = "__sem__";

interface TodayTask {
  id: number;
  name: string;
  emoji: string | null;
  due_date: string;
  due_time: string | null;
  category: string | null;
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
}: DashboardClientProps) {
  const [classeInfo, setClasseInfo] = useState(initialClasse);
  const [levelInfo, setLevelInfo] = useState(initialLevelInfo);
  const [xpToday, setXpToday] = useState(initialXpToday);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [levelUpLevel, setLevelUpLevel]   = useState<number | null>(null);
  const [bonusAwarded, setBonusAwarded]   = useState(false);
  const [bonusPop, setBonusPop]           = useState<number | null>(null);
  const [collapsed, setCollapsed]         = useState<Record<string, boolean>>({});

  const [doneSet, setDoneSet] = useState<Set<number>>(
    () => new Set(initialActivities.filter((a) => a.doneToday).map((a) => a.id))
  );

  const [filtro, setFiltro] = useState<"todas" | "daily" | "semanal">("daily");
  const toggleCollapse = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const isDailyLike = (a: Activity) => a.frequency === "daily" || a.frequency === "once" || (a.frequency === "nx_week" && !!a.scheduled_days);
  const isSemanal   = (a: Activity) => a.frequency === "weekly" || (a.frequency === "nx_week" && !a.scheduled_days) || a.frequency === "free";
  const applyFiltro = (list: Activity[]) =>
    filtro === "todas" ? list :
    filtro === "daily" ? list.filter(isDailyLike) :
    list.filter(isSemanal);

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

  // Dia Perfeito: conta apenas atividades diárias
  const dailyActivities = initialActivities.filter((a) => a.frequency === "daily");
  const dailyDoneCount = dailyActivities.filter((a) => doneSet.has(a.id)).length;
  const allDailyDone = dailyActivities.length > 0 && dailyDoneCount === dailyActivities.length;
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

      <div className="page neo-page">
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
            {dailyActivities.length > 0 && (
              <div className="chip">
                <span className="num">{dailyDoneCount}</span>
                <span>/{dailyActivities.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hero + Atributos */}
        <div className="hero-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <HeroXPCard levelInfo={levelInfo} xpToday={xpToday} classeCor={classeInfo.cor} />
            <PainelAtributos
              initialAtributos={atributos}
              initialPontos={pontosDisponiveis}
              initialClasse={classeInfo}
              onClasseChange={setClasseInfo}
            />
          </div>
          <HeroCharCard
            rank={getLevelTitle(levelInfo.level)}
            level={levelInfo.level}
            classeCor={classeInfo.cor}
          />
        </div>

        {/* Missões por categoria */}
        <div className="section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
            <h2 style={{ margin: 0 }}>Missões do Dia</h2>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {doneCount} / {totalCount} concluídas
            </span>
          </div>

          {/* Filtros de frequência */}
          {initialActivities.length > 0 && (() => {
            const chips = [
              { k: "daily"  as const, l: "Diárias",  cnt: initialActivities.filter(isDailyLike).length },
              { k: "semanal"as const, l: "Semanais", cnt: initialActivities.filter(isSemanal).length },
              { k: "todas"  as const, l: "Todas",    cnt: initialActivities.length },
            ].filter((c) => c.k === "todas" || c.cnt > 0);
            return (
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                {chips.map((c) => (
                  <button key={c.k} onClick={() => setFiltro(c.k)} style={{
                    padding: "5px 13px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                    border: filtro === c.k ? "1px solid rgba(0,184,232,.45)" : "1px solid rgba(120,150,180,.18)",
                    background: filtro === c.k ? "rgba(0,184,232,.12)" : "transparent",
                    color: filtro === c.k ? "var(--accent-teal)" : "var(--text-muted)",
                  }}>
                    {c.l} <span style={{ opacity: 0.6 }}>{c.cnt}</span>
                  </button>
                ))}
              </div>
            );
          })()}

          {initialActivities.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {allDailyDone && (
                <div style={{
                  marginBottom: "16px", padding: "12px 16px", borderRadius: "12px",
                  background: "rgba(47,208,154,.07)", border: "1px solid rgba(47,208,154,.4)",
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <span style={{ fontSize: "18px" }}>⚡</span>
                  <div>
                    <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "#2fd09a", textTransform: "uppercase" }}>Dia Perfeito</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "1px" }}>
                      Todas as missões concluídas · combo de <b style={{ color: "#2fd09a" }}>+{comboXp} XP</b>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const catKeys = [
                  ...CATEGORIAS_ORDEM.filter((c) => initialActivities.some((a) => a.categoria === c)),
                  ...(initialActivities.some((a) => !a.categoria) ? [SEM_CATEGORIA] : []),
                ];

                return catKeys.map((cat) => {
                  const items = applyFiltro(initialActivities
                    .filter((a) => (a.categoria ?? SEM_CATEGORIA) === cat))
                    .sort((a, b) => (doneSet.has(a.id) ? 1 : 0) - (doneSet.has(b.id) ? 1 : 0));
                  if (items.length === 0) return null;

                  const cor      = CATEGORIA_COR[cat] ?? "var(--accent-violet)";
                  const label    = cat === SEM_CATEGORIA ? "Sem categoria" : (CATEGORIA_LABELS[cat] ?? cat);
                  const attrKey  = cat !== SEM_CATEGORIA ? (CATEGORIA_ATRIBUTO[cat] ?? null) : null;
                  const doneCat  = items.filter((a) => doneSet.has(a.id)).length;
                  const isOpen   = !collapsed[cat];

                  return (
                    <div key={cat} style={{ marginBottom: "24px" }}>
                      <button
                        onClick={() => toggleCollapse(cat)}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          width: "100%", background: "none", border: "none",
                          cursor: "pointer", padding: "0 0 12px", textAlign: "left",
                        }}
                      >
                        <div style={{ width: "3px", height: "18px", borderRadius: "2px", background: cor, flexShrink: 0 }} />
                        <span style={{
                          fontFamily: "var(--font-space-grotesk)", fontSize: "13px", fontWeight: 700,
                          letterSpacing: ".08em", textTransform: "uppercase", color: cor,
                        }}>
                          {label}
                        </span>
                        {attrKey && (
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px",
                            background: `${COR_ATTR[attrKey]}22`, color: COR_ATTR[attrKey],
                            border: `1px solid ${COR_ATTR[attrKey]}44`,
                            fontFamily: "var(--font-space-grotesk)", letterSpacing: ".06em",
                          }}>+{attrKey}</span>
                        )}
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {doneCat}/{items.length}
                        </span>
                        <span style={{
                          marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)",
                          display: "inline-block", transition: "transform .2s",
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        }}>▶</span>
                      </button>

                      {isOpen && (
                        <div className="act-grid">
                          {items.map((activity) => (
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
                      )}
                    </div>
                  );
                });
              })()}
            </>
          )}
        </div>

        {/* Status do dia */}
        <div className="section">
          <PainelStatus
            maxStreak={maxStreak}
            doneCount={dailyDoneCount}
            totalCount={dailyActivities.length}
            totalXP={levelInfo.totalXP}
          />
        </div>

        {/* Missão do Sistema */}
        {dailyActivities.length > 0 && (
          <div className="section">
            <MissaoDoSistema
              doneCount={dailyDoneCount}
              totalCount={dailyActivities.length}
              comboXp={comboXp}
            />
          </div>
        )}

        {/* Notificações PWA */}
        <div className="section">
          <NotificationSetup />
        </div>

        {/* Agenda de Hoje */}
        {todayTasks.length > 0 && (
          <div className="section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
              <h2 style={{ margin: 0 }}>📅 Agenda de Hoje</h2>
              <Link href="/agenda" style={{ fontSize: "11px", color: "var(--accent-teal)", textDecoration: "none", letterSpacing: ".06em" }}>
                Ver tudo →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {todayTasks.map((t) => (
                <div key={t.id} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>{t.emoji ?? "📌"}</span>
                  <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</span>
                  {t.due_time && (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{t.due_time}</span>
                  )}
                  {t.due_date < new Date().toISOString().slice(0, 10) && (
                    <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700, letterSpacing: ".07em" }}>ATRASADA</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
