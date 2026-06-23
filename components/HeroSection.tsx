"use client";

import { useState } from "react";

interface LevelInfo {
  level: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
}

interface HeroSectionProps {
  levelInfo: LevelInfo;
  xpToday: number;
  classeCor?: string;
}

export function getLevelTitle(level: number): string {
  if (level < 5)   return "E-RANK";
  if (level < 10)  return "D-RANK";
  if (level < 15)  return "C-RANK";
  if (level < 20)  return "B-RANK";
  if (level < 30)  return "A-RANK";
  if (level < 50)  return "S-RANK";
  if (level < 80)  return "NACIONAL";
  if (level < 100) return "MONARCA";
  return "REI DAS SOMBRAS";
}

function getRankRange(level: number): string {
  if (level < 5)   return "1 → 4";
  if (level < 10)  return "5 → 9";
  if (level < 15)  return "10 → 14";
  if (level < 20)  return "15 → 19";
  if (level < 30)  return "20 → 29";
  if (level < 50)  return "30 → 49";
  if (level < 80)  return "50 → 79";
  if (level < 100) return "80 → 99";
  return "100+";
}

const RANK_EMOJI: Record<string, string> = {
  "E-RANK":          "🧙‍♂️",
  "D-RANK":          "⚔️",
  "C-RANK":          "🛡️",
  "B-RANK":          "🗡️",
  "A-RANK":          "🦅",
  "S-RANK":          "👑",
  "NACIONAL":        "🌟",
  "MONARCA":         "🔱",
  "REI DAS SOMBRAS": "💀",
};

const RANK_IMAGE: Record<string, string> = {
  "E-RANK":          "/characters/e-rank.jpg.png",
  "D-RANK":          "/characters/d-rank.jpg.png",
  "C-RANK":          "/characters/c-rank.jpg.png",
  "B-RANK":          "/characters/b-rank.jpg.png",
  "A-RANK":          "/characters/a-rank.jpg.png",
  "S-RANK":          "/characters/s-rank.jpg.png",
  "NACIONAL":        "/characters/nacional.jpg.png",
  "MONARCA":         "/characters/monarca.jpg.png",
  "REI DAS SOMBRAS": "/characters/rei-das-sombras.jpg.png",
};

const RANK_GLOW: Record<string, string> = {
  "E-RANK":          "rgba(0,150,200,.6)",
  "D-RANK":          "rgba(0,180,232,.7)",
  "C-RANK":          "rgba(0,200,255,.7)",
  "B-RANK":          "rgba(80,150,255,.7)",
  "A-RANK":          "rgba(120,80,255,.8)",
  "S-RANK":          "rgba(180,80,255,.9)",
  "NACIONAL":        "rgba(255,180,0,.9)",
  "MONARCA":         "rgba(180,0,255,1)",
  "REI DAS SOMBRAS": "rgba(100,0,200,1)",
};

function CharPortrait({ rank, level, classeCor }: { rank: string; level: number; classeCor?: string }) {
  const [imgError, setImgError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [posX, setPosX] = useState(() => typeof window === "undefined" ? 50 : Number(localStorage.getItem("portrait-x-v3") ?? 50));
  const [posY, setPosY] = useState(() => typeof window === "undefined" ? 30 : Number(localStorage.getItem("portrait-y-v3") ?? 30));
  const [zoom, setZoom] = useState(() => typeof window === "undefined" ? 100 : Number(localStorage.getItem("portrait-z-v3") ?? 100));

  const imgSrc   = RANK_IMAGE[rank] ? `${RANK_IMAGE[rank]}?v=2` : undefined;
  const rankGlow = RANK_GLOW[rank] ?? "rgba(139,92,246,.6)";
  const glow     = classeCor ? `${classeCor}99` : rankGlow;
  const emoji    = RANK_EMOJI[rank] ?? "🧙‍♂️";
  const range    = getRankRange(level);

  function saveX(v: number) { setPosX(v); localStorage.setItem("portrait-x-v3", String(v)); }
  function saveY(v: number) { setPosY(v); localStorage.setItem("portrait-y-v3", String(v)); }
  function saveZ(v: number) { setZoom(v); localStorage.setItem("portrait-z-v3", String(v)); }

  if (!imgError && imgSrc) {
    return (
      <div style={{
        position: "relative", width: "100%", flex: 1,
        borderRadius: "var(--r-md)", overflow: "hidden",
        minHeight: "280px",
        background: "var(--bg-surface)",
        border: "1px solid rgba(139,92,246,.35)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={rank}
          onError={() => setImgError(true)}
          style={{
            position: "absolute",
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition: `${posX}% ${posY}%`,
            transformOrigin: `${posX}% ${posY}%`,
            transform: `scale(${zoom / 100})`,
            display: "block",
          }}
        />
        {/* Ornamental inner frames */}
        <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(139,92,246,.35)", borderRadius: 6, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 11, border: "1px solid rgba(255,206,71,.18)", borderRadius: 5, pointerEvents: "none" }} />

        {/* Bottom gradient + glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(4,8,16,.85) 0%, rgba(4,8,16,.15) 18%, transparent 32%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          boxShadow: `inset 0 0 40px ${glow.replace("1)", ".12)")}`,
        }} />

        {/* Adjust button */}
        <button
          onClick={() => setEditing((e) => !e)}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 10,
            background: "rgba(0,0,0,.55)", border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 6, padding: "3px 7px", cursor: "pointer",
            fontSize: "11px", color: "rgba(255,255,255,.7)", lineHeight: 1,
          }}
          title="Ajustar enquadramento"
        >⊹</button>

        {editing && (
          <div style={{
            position: "absolute", top: 32, right: 8, zIndex: 10,
            background: "rgba(4,8,20,.92)", border: "1px solid rgba(69,205,240,.3)",
            borderRadius: 8, padding: "10px 12px", width: 165,
          }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: 8, letterSpacing: ".12em", textTransform: "uppercase" }}>Enquadramento</div>
            <label style={{ fontSize: "10px", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>← → {posX}%</label>
            <input type="range" min={0} max={100} value={posX} onChange={(e) => saveX(Number(e.target.value))}
              style={{ width: "100%", marginBottom: 8, accentColor: "var(--accent-teal)" }} />
            <label style={{ fontSize: "10px", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>↑ ↓ {posY}%</label>
            <input type="range" min={0} max={100} value={posY} onChange={(e) => saveY(Number(e.target.value))}
              style={{ width: "100%", marginBottom: 8, accentColor: "var(--accent-teal)" }} />
            <label style={{ fontSize: "10px", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>🔍 zoom {zoom}%</label>
            <input type="range" min={50} max={300} value={zoom} onChange={(e) => saveZ(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-teal)" }} />
          </div>
        )}

        {/* Name + rank overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
          <div style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "20px", fontWeight: 700, letterSpacing: ".18em",
            color: "#e8f4ff",
            textShadow: `0 0 20px ${glow}, 0 2px 8px rgba(0,0,0,.8)`,
            textTransform: "uppercase", lineHeight: 1,
          }}>Fabricio</div>
          <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "10px", letterSpacing: ".2em", fontWeight: 700,
              color: "var(--accent-violet-bright)",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              textShadow: `0 0 12px ${glow}`,
            }}>{rank}</span>
            <span style={{ width: "1px", height: "10px", background: "rgba(0,168,232,.3)" }} />
            <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: ".1em" }}>LV.{level}</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback — card-game style (no photo)
  return (
    <div style={{
      position: "relative", flex: 1, borderRadius: "var(--r-md)", overflow: "hidden",
      background: "radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,.32), transparent 60%), linear-gradient(180deg, #1a1430, #0c0a1c 70%)",
      border: "1px solid rgba(139,92,246,.4)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "280px", gap: 0,
    }}>
      {/* Ornamental frames */}
      <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(139,92,246,.35)", borderRadius: 6, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 11, border: "1px solid rgba(255,206,71,.18)", borderRadius: 5, pointerEvents: "none" }} />

      {/* Content */}
      <div style={{
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: 28, fontWeight: 700, letterSpacing: ".06em",
        color: "#e7d9ff",
        textShadow: "0 2px 14px rgba(139,92,246,.7)",
        lineHeight: 1, marginTop: 16,
      }}>{rank}</div>
      <div style={{
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: 11, fontWeight: 600, color: "rgba(231,217,255,.55)",
        letterSpacing: ".3em", marginTop: 5,
      }}>{range}</div>
      <div style={{ fontSize: 72, lineHeight: 1, marginTop: 10, filter: "drop-shadow(0 6px 18px rgba(139,92,246,.55))", animation: "bob 5s ease-in-out infinite" }}>
        {emoji}
      </div>

      {/* Name + rank at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
        <div style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: "18px", fontWeight: 700, letterSpacing: ".18em",
          color: "#e8f4ff",
          textShadow: "0 0 20px rgba(139,92,246,.7), 0 2px 8px rgba(0,0,0,.8)",
          textTransform: "uppercase", lineHeight: 1,
        }}>Fabricio</div>
        <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "10px", letterSpacing: ".2em", fontWeight: 700,
            color: "var(--accent-violet-bright)",
            fontFamily: "var(--font-space-grotesk), sans-serif",
          }}>{rank}</span>
          <span style={{ width: "1px", height: "10px", background: "rgba(139,92,246,.4)" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: ".1em" }}>LV.{level}</span>
        </div>
      </div>
    </div>
  );
}

export function HeroXPCard({ levelInfo, xpToday, classeCor }: HeroSectionProps) {
  const { level, currentLevelXP, nextLevelXP, progress, totalXP } = levelInfo;
  const xpRemaining = nextLevelXP - currentLevelXP;
  const nearLevel   = progress >= 80;
  const rank        = getLevelTitle(level);

  return (
    <div className="hero">
      <div className="hero-top">
        <div className="level-badge" style={{ "--p": progress } as React.CSSProperties}>
          <span className="lv-label">LV</span>
          <span className="lv-num num">{level}</span>
        </div>

        <div className="hero-meta">
          <div className="hero-title"><b>{rank}</b></div>
          <div className="hero-sub">{totalXP.toLocaleString("pt-BR")} XP ACUMULADO</div>
          {nearLevel && (
            <div className="near-level-hint" style={{ marginTop: "6px" }}>
              ⚡ FALTAM {xpRemaining.toLocaleString("pt-BR")} XP → LV.{level + 1}
            </div>
          )}
        </div>

        {xpToday > 0 && (
          <div className="hero-xptoday">
            <div className="big num num-pop">+{xpToday}</div>
            <div className="lbl">XP HOJE</div>
          </div>
        )}
      </div>

      <div className="xp-wrap">
        <div className="xp-meta">
          <span className="cur"><b className="num">{currentLevelXP.toLocaleString("pt-BR")}</b> XP</span>
          <span className="next num">
            {nearLevel
              ? `⚡ ${xpRemaining.toLocaleString("pt-BR")} XP RESTANTES`
              : `${nextLevelXP.toLocaleString("pt-BR")} → LV.${level + 1}`}
          </span>
        </div>
        <div className="xp-track">
          <div
            className={`xp-fill${nearLevel ? " near-level" : ""}`}
            style={{ "--xp": `${progress}%` } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

export function HeroCharCard({ rank, level, classeCor }: { rank: string; level: number; classeCor?: string }) {
  return (
    <div className="hero-char" style={{
      padding: "14px", gap: "0",
      borderColor: classeCor ? `${classeCor}40` : "rgba(139,92,246,.3)",
      background: "var(--bg-card)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span className="eyebrow">[ JOGADOR ]</span>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>◈</span>
      </div>
      <CharPortrait rank={rank} level={level} classeCor={classeCor} />
    </div>
  );
}

export function HeroSection({ levelInfo, xpToday, classeCor }: HeroSectionProps) {
  const rank = getLevelTitle(levelInfo.level);
  return (
    <div className="hero-grid">
      <HeroXPCard levelInfo={levelInfo} xpToday={xpToday} classeCor={classeCor} />
      <HeroCharCard rank={rank} level={levelInfo.level} classeCor={classeCor} />
    </div>
  );
}
