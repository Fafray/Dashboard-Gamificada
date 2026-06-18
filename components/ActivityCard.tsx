"use client";

import { useState, useRef } from "react";
import { getStreakMilestone } from "@/lib/gamification";
import { CATEGORIA_ATRIBUTO, CATEGORIA_LABELS, xpComBonus } from "@/lib/attributes";
import type { Atributos } from "@/lib/attributes";

const COR_ATTR: Record<string, string> = {
  FOR: "#f0556a",
  VIT: "#25d99a",
  AGI: "#ffce47",
  INT: "#8b5cf6",
  PER: "#45cdf0",
};

const CATEGORIA_COR: Record<string, string> = {
  saude:      "#25d99a",
  treino:     "#f0556a",
  estudo:     "#45cdf0",
  disciplina: "#ffce47",
  foco:       "#8b5cf6",
};

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
  keystoneBonusXP?: number;
  newStreak: number;
  weeklyCount: number | null;
  levelInfo: LevelInfo;
  newlyUnlocked: { key: string; name: string; description: string; emoji: string }[];
  graduation_available?: boolean;
}

interface UndoResult {
  xpSubtracted: number;
  levelInfo: LevelInfo;
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
  micro_version: string | null;
  anchor_context: string | null;
  is_keystone: boolean;
  graduation_count: number;
  due_date?: string | null;
}

interface ActivityCardProps {
  activity: Activity;
  atributos?: Atributos;
  isBonusMission?: boolean;
  initialAccumulated?: number | null;
  onCheckin: (result: CheckinResult) => void;
  onUndo: (result: UndoResult) => void;
}

const FREQ_LABEL: Record<string, string> = {
  daily: "Diária", weekly: "Semanal", free: "Livre", nx_week: "/ sem.",
};

function defaultIncrement(unit: string | null): number {
  if (!unit) return 1;
  const u = unit.toUpperCase();
  if (u === "L") return 0.5;
  if (u === "ML") return 250;
  if (u === "H") return 1;
  if (u === "MIN") return 10;
  if (u === "KM") return 1;
  if (u === "PÁGINAS" || u === "PG" || u === "PAG") return 5;
  return 1;
}

export function ActivityCard({ activity, atributos, isBonusMission, initialAccumulated, onCheckin, onUndo }: ActivityCardProps) {
  const [done, setDone] = useState(activity.doneToday);
  const [checkinId, setCheckinId] = useState<number | null>(activity.todayCheckinId);
  const [streak, setStreak] = useState(activity.streak.current);
  const [weeklyCount, setWeeklyCount] = useState(activity.weeklyCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [xpPops, setXpPops] = useState<{ id: number; text: string }[]>([]);
  const [milestoneFiring, setMilestoneFiring] = useState(false);
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [newMinimum, setNewMinimum] = useState("");
  const [savingGraduation, setSavingGraduation] = useState(false);
  const [numValue, setNumValue] = useState<string>(
    activity.target_value ? String(activity.target_value) : ""
  );
  const isIncremental = activity.frequency === "daily" && !!activity.target_value && !activity.micro_version;
  const [accumulated, setAccumulated] = useState<number>(initialAccumulated ?? 0);
  const [incrementInput, setIncrementInput] = useState<string>(
    String(defaultIncrement(activity.target_unit))
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const isNxWeek  = activity.frequency === "nx_week";
  const isOnce    = activity.frequency === "once";
  const hasTarget = !!activity.target_value;

  const daysLeft = (() => {
    if (!isOnce || !activity.due_date) return null;
    const today = new Date().toISOString().slice(0, 10);
    const due   = activity.due_date;
    if (due < today) return -1;
    if (due === today) return 0;
    return Math.ceil((new Date(due + "T23:59:59").getTime() - Date.now()) / 86400000);
  })();

  const attrKey    = activity.categoria ? CATEGORIA_ATRIBUTO[activity.categoria] : null;
  const attrCor    = attrKey ? COR_ATTR[attrKey] : "var(--accent-teal)";
  const xpEfetivo  = atributos && activity.categoria
    ? xpComBonus(activity.xp_base, activity.categoria, atributos)
    : activity.xp_base;
  const weekTarget = activity.weekly_target ?? 1;
  const weeklyDone = isNxWeek && weeklyCount >= weekTarget;
  const numParsed  = parseFloat(numValue) || 0;
  const targetVal  = activity.target_value ?? 0;
  const barPct     = targetVal > 0 ? Math.min(120, (numParsed / targetVal) * 100) : 0;
  const barStatus  = numParsed >= targetVal * 1.05 ? "over" : numParsed >= targetVal ? "at" : "below";

  function addXpPop(xp: number, newStreak: number) {
    const milestone = getStreakMilestone(newStreak);
    const text = milestone ? `+${xp} XP ${milestone.emoji}` : `+${xp} XP`;
    const id = Date.now();
    setXpPops((prev) => [...prev, { id, text }]);
    setTimeout(() => setXpPops((prev) => prev.filter((x) => x.id !== id)), 1100);
    if (milestone) {
      setMilestoneFiring(true);
      setTimeout(() => setMilestoneFiring(false), 700);
    }
  }

  async function handleAccumulate() {
    const inc = parseFloat(incrementInput);
    if (!inc || inc <= 0 || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkins/accumulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activity.id, increment: inc }),
      });
      if (!res.ok) { alert((await res.json()).error || "Erro ao registrar"); return; }
      const result = await res.json();
      setAccumulated(result.total);
      setCheckinId(result.checkinId);
      if (result.targetReached && result.xpEarned > 0) {
        setDone(true);
        setJustDone(true);
        addXpPop(result.xpEarned, streak);
        setTimeout(() => setJustDone(false), 720);
        onCheckin({
          checkin: { id: result.checkinId, xp_earned: result.xpEarned },
          xpEarned: result.xpEarned,
          newStreak: streak,
          weeklyCount: null,
          levelInfo: result.levelInfo,
          newlyUnlocked: [],
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin(level?: "minimum" | "beyond") {
    if (done || loading || weeklyDone) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = { activity_id: activity.id };
      if (hasTarget && numValue) body.actual_value = parseFloat(numValue);
      if (level) body.checkin_level = level;

      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert((await res.json()).error || "Erro ao registrar check-in"); return; }
      const result: CheckinResult = await res.json();

      if (isNxWeek) {
        const newCount = result.weeklyCount ?? weeklyCount + 1;
        setWeeklyCount(newCount);
        if (newCount >= weekTarget) setDone(true);
      } else {
        setDone(true);
      }

      setCheckinId(result.checkin.id);
      setStreak(result.newStreak);
      setJustDone(true);
      addXpPop(result.xpEarned, result.newStreak);
      setTimeout(() => setJustDone(false), 720);
      onCheckin(result);

      if (result.graduation_available) {
        setNewMinimum("");
        setTimeout(() => setGraduationOpen(true), 800);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGraduation(evolve: boolean) {
    if (!evolve) { setGraduationOpen(false); return; }
    if (!newMinimum.trim()) return;
    setSavingGraduation(true);
    try {
      await fetch(`/api/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ micro_version: newMinimum.trim(), graduation_count: activity.graduation_count + 1 }),
      });
      setGraduationOpen(false);
    } finally {
      setSavingGraduation(false);
    }
  }

  async function handleUndo() {
    if (!checkinId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checkins/${checkinId}`, { method: "DELETE" });
      if (!res.ok) return;
      const result: UndoResult = await res.json();
      setDone(false);
      setCheckinId(null);
      setStreak((s) => Math.max(0, s - 1));
      if (isNxWeek) setWeeklyCount((c) => Math.max(0, c - 1));
      onUndo(result);
    } finally {
      setLoading(false);
    }
  }

  const milestone  = getStreakMilestone(streak);
  const isDone     = isNxWeek ? weeklyDone : done;
  const cor        = CATEGORIA_COR[activity.categoria ?? ""] ?? "#1aa9d6";

  return (
    <div
      ref={cardRef}
      className={`act${isDone ? " done" : ""}${justDone ? " justdone" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        ...(isBonusMission && !isDone ? { border: "1px solid rgba(239,165,39,.5)", boxShadow: "0 0 16px rgba(239,165,39,.08)" } : {}),
        borderTop: `3px solid ${cor}`,
      }}
    >
      <div className="pulse-ring" />
      {xpPops.map((pop) => (
        <div key={pop.id} className="xp-pop go">{pop.text}</div>
      ))}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        {/* Emoji box com cor da categoria */}
        <div style={{
          width: 42, height: 42, flexShrink: 0, borderRadius: 9,
          background: `${cor}1a`,
          border: `1px solid ${cor}38`,
          display: "grid", placeItems: "center", fontSize: 20,
          transition: "box-shadow .2s",
          boxShadow: isDone ? `0 0 8px ${cor}55` : "none",
        }}>
          {activity.emoji || "⚡"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nome + tags + streak/pips (mesma linha) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: 14,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{activity.name}</span>

            {activity.is_keystone && (
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".08em",
                background: "rgba(239,165,39,.15)", border: "1px solid rgba(239,165,39,.4)",
                color: "#efa527", borderRadius: "4px", padding: "1px 5px" }}>⚓ ÂNCORA</span>
            )}
            {isBonusMission && !isDone && (
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".08em",
                background: "rgba(239,165,39,.12)", border: "1px solid rgba(239,165,39,.35)",
                color: "#efa527", borderRadius: "4px", padding: "1px 5px" }}>🎯 MISSÃO</span>
            )}

            {/* Tag categoria */}
            {activity.categoria && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                letterSpacing: ".05em", textTransform: "uppercase",
                background: `${cor}1a`, color: cor, border: `1px solid ${cor}38`,
              }}>{CATEGORIA_LABELS[activity.categoria]}</span>
            )}
            {/* Tag atributo */}
            {attrKey && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                letterSpacing: ".05em",
                background: `${attrCor}1a`, color: attrCor, border: `1px solid ${attrCor}38`,
              }}>{attrKey}</span>
            )}

            {/* Streak diário (inline, à direita) */}
            {!isNxWeek && !isOnce && streak > 0 && (
              <span
                style={{ marginLeft: "auto", fontSize: 11.5, color: "#ffce47", fontWeight: 700,
                  whiteSpace: "nowrap", fontFamily: "var(--font-space-grotesk)" }}
                className={milestoneFiring ? "streak-milestone" : ""}
              >
                🔥 {streak}{milestone ? ` ${milestone.emoji}` : ""}
              </span>
            )}

            {/* Pips nx_week */}
            {isNxWeek && (
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: weekTarget }).map((_, i) => (
                    <span key={i} style={{
                      width: 9, height: 9, borderRadius: "50%",
                      background: i < weeklyCount ? "var(--accent-teal)" : "transparent",
                      border: `1.5px solid ${i < weeklyCount ? "var(--accent-teal)" : "var(--border)"}`,
                    }} />
                  ))}
                </span>
                <span style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: 11, fontWeight: 700,
                  color: weeklyDone ? "var(--accent-violet-bright)" : "var(--text-muted)",
                }}>
                  {weeklyDone ? "✓ SEMANA OK" : `${weeklyCount}/${weekTarget} ESTA SEM.`}
                </span>
              </span>
            )}

            {/* Prazo missão única */}
            {isOnce && daysLeft !== null && (
              <span style={{ marginLeft: "auto" }}>
                <span style={{
                  fontSize: "9px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase",
                  color: daysLeft <= 0 ? "#ef4444" : daysLeft <= 2 ? "#f97316" : "#efa527",
                  background: daysLeft <= 0 ? "rgba(239,68,68,.12)" : daysLeft <= 2 ? "rgba(249,115,22,.12)" : "rgba(239,165,39,.12)",
                  border: `1px solid ${daysLeft <= 0 ? "rgba(239,68,68,.4)" : daysLeft <= 2 ? "rgba(249,115,22,.4)" : "rgba(239,165,39,.4)"}`,
                  borderRadius: "5px", padding: "2px 6px",
                }}>
                  {daysLeft <= 0 ? "HOJE" : daysLeft === 1 ? "AMANHÃ" : `${daysLeft}d`}
                </span>
              </span>
            )}
          </div>

          {/* Frequência + meta */}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
            <span style={{ marginRight: 3 }}>·</span>
            {isNxWeek ? `${weekTarget}x / sem.` : isOnce ? "Missão única" : FREQ_LABEL[activity.frequency]}
            {activity.target_value && (
              <span style={{ color: "var(--accent-teal)" }}> · META: {activity.target_value}{activity.target_unit}</span>
            )}
          </div>
          {activity.anchor_context && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, fontStyle: "italic" }}>
              {activity.anchor_context}
            </div>
          )}

          {/* Banner de streak milestone */}
          {milestone && streak > 0 && !isNxWeek && (
            <div style={{
              margin: "8px 0 0", padding: "5px 9px", borderRadius: 6,
              background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.25)",
              fontSize: 11, color: "var(--accent-gold)", fontWeight: 700,
              letterSpacing: ".04em", fontFamily: "var(--font-space-grotesk), sans-serif",
            }}>
              {milestone.emoji} {milestone.name} · {streak} dias consecutivos
            </div>
          )}
        </div>
      </div>

      {/* HUD — tracking incremental (daily + target) */}
      {isIncremental && (
        <div className="hud-input-wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: isDone ? "#2fd09a" : "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {accumulated % 1 === 0 ? accumulated : accumulated.toFixed(1)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              / {activity.target_value} {activity.target_unit}
            </span>
          </div>
          <div className="hud-bar-track" style={{ marginBottom: "10px" }}>
            <div
              className={`hud-bar-fill ${accumulated >= (activity.target_value ?? 0) ? "at" : "below"}`}
              style={{ width: `${Math.min(100, (accumulated / (activity.target_value ?? 1)) * 100)}%`, transition: "width 0.3s ease" }}
            />
          </div>
          {!isDone && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="number"
                value={incrementInput}
                onChange={(e) => setIncrementInput(e.target.value)}
                min={0.1}
                step={defaultIncrement(activity.target_unit)}
                style={{
                  width: "70px", padding: "6px 8px", borderRadius: "8px",
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: "14px", fontWeight: 600,
                  textAlign: "center", outline: "none",
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", minWidth: "30px" }}>
                {activity.target_unit}
              </span>
              <button
                onClick={handleAccumulate}
                disabled={loading}
                style={{
                  flex: 1, padding: "7px 12px", borderRadius: "8px",
                  background: "var(--accent-teal)", color: "#04121c",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  border: "none", letterSpacing: ".05em", opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "..." : "+ Adicionar"}
              </button>
            </div>
          )}
          {isDone && (
            <div className="hud-done-badge">
              <span>✓</span>
              <span className="hud-done-value">{accumulated % 1 === 0 ? accumulated : accumulated.toFixed(1)} {activity.target_unit}</span>
              <span style={{ color: "var(--text-muted)", letterSpacing: ".06em", fontSize: "11px" }}>META ATINGIDA</span>
            </div>
          )}
        </div>
      )}

      {/* HUD — numérico legado (weekly/nx_week com target) */}
      {hasTarget && !isIncremental && !isDone && (
        <div className="hud-input-wrap">
          <div className="hud-input-row">
            <input type="number" value={numValue} onChange={(e) => setNumValue(e.target.value)}
              min={0} step={0.1} placeholder={String(activity.target_value)} />
            <span className="hud-unit">{activity.target_unit}</span>
            <span className="hud-target-label">/ {activity.target_value}</span>
          </div>
          <div className="hud-bar-track">
            <div className={`hud-bar-fill ${barStatus}`} style={{ width: `${Math.min(100, barPct)}%` }} />
          </div>
        </div>
      )}
      {hasTarget && !isIncremental && isDone && (
        <div className="hud-done-badge">
          <span>✓</span>
          <span className="hud-done-value">{numValue || "—"} {activity.target_unit}</span>
          <span style={{ color: "var(--text-muted)", letterSpacing: ".06em", fontSize: "11px" }}>REGISTRADO</span>
        </div>
      )}

      {/* Zona de ação — sempre no rodapé via margin-top: auto */}
      <div className="act-foot" style={{ marginTop: "auto", paddingTop: 12 }}>
        {isIncremental ? (
          isDone ? (
            <button className="btn-checkin" disabled style={{ opacity: 0.7 }}>
              ✓ META ATINGIDA · +{xpEfetivo} XP
            </button>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", color: "var(--text-muted)", letterSpacing: ".06em" }}>
              {accumulated > 0
                ? `Em progresso — falta ${((activity.target_value ?? 0) - accumulated).toFixed(1).replace(".0", "")} ${activity.target_unit}`
                : "Adicione acima para registrar"}
            </div>
          )
        ) : activity.micro_version && !isDone ? (
          <>
            <button
              className="btn-checkin"
              onClick={() => handleCheckin("minimum")}
              disabled={loading}
              title={activity.micro_version}
              style={{ flex: 1, background: "transparent", border: `1px solid ${activity.color}55`, color: "var(--text-secondary)" }}
            >
              {loading ? "..." : `Mínimo · +${xpEfetivo} XP`}
            </button>
            <button
              className="btn-checkin"
              onClick={() => handleCheckin("beyond")}
              disabled={loading}
              style={{ flex: 1, background: activity.color, color: "#04121c" }}
            >
              {loading ? "..." : `Além · +${Math.round(xpEfetivo * 1.25)} XP`}
            </button>
          </>
        ) : (
          <button
            className="btn-checkin"
            onClick={() => handleCheckin()}
            disabled={isDone || loading || (isNxWeek && weeklyDone)}
          >
            {loading ? "..."
              : isDone ? (isNxWeek ? "✓ Semana completa" : "✓ Missão concluída")
              : hasTarget && numValue ? `Registrar ${numValue} ${activity.target_unit ?? ""}`
              : isNxWeek ? `Executar ${weeklyCount + 1}/${weekTarget}`
              : isOnce ? `Concluir missão · +${xpEfetivo} XP`
              : `Completar · +${xpEfetivo} XP`}
          </button>
        )}

        {checkinId && (
          <button className="btn-undo" onClick={handleUndo} title="Desfazer último check-in">↩</button>
        )}
      </div>

      {/* Modal de graduação */}
      {graduationOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", padding: "16px" }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid rgba(255,215,0,.3)",
            borderRadius: "16px", padding: "24px", maxWidth: "360px", width: "100%",
            boxShadow: "0 0 60px rgba(255,215,0,.1), 0 24px 48px rgba(0,0,0,.8)",
          }}>
            <div style={{ fontSize: "28px", textAlign: "center", marginBottom: "8px" }}>🎯</div>
            <h3 style={{ color: "var(--text-primary)", fontWeight: 700, textAlign: "center", marginBottom: "4px" }}>
              Hábito consolidado!
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>
              <em>"{activity.micro_version}"</em> virou rotina. Quer evoluir seu mínimo?
            </p>
            <input
              type="text"
              value={newMinimum}
              onChange={(e) => setNewMinimum(e.target.value)}
              placeholder="Novo mínimo (ex: 10 min de corrida)"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "8px",
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: "14px", outline: "none", marginBottom: "12px",
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => handleGraduation(false)} style={{
                flex: 1, padding: "10px", borderRadius: "8px",
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer",
              }}>Manter</button>
              <button
                onClick={() => handleGraduation(true)}
                disabled={!newMinimum.trim() || savingGraduation}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  background: newMinimum.trim() ? "#efa527" : "rgba(239,165,39,.3)",
                  border: "none", color: "white", fontWeight: 700,
                  cursor: newMinimum.trim() ? "pointer" : "not-allowed",
                }}
              >
                {savingGraduation ? "..." : "Evoluir →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
