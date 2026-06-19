"use client";

import Image from "next/image";
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

function getLevelTitle(level: number): string {
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

export function HeroSection({ levelInfo, xpToday, classeCor }: HeroSectionProps) {
  const { level, currentLevelXP, nextLevelXP, progress, totalXP } = levelInfo;
  const [imgError, setImgError] = useState(false);

  const xpRemaining = nextLevelXP - currentLevelXP;
  const nearLevel   = progress >= 80;
  const rank        = getLevelTitle(level);
  const imgSrc      = RANK_IMAGE[rank];
  const rankGlow    = RANK_GLOW[rank] ?? "rgba(0,150,200,.6)";
  const glow        = classeCor ? `${classeCor}99` : rankGlow;

  return (
    <div className="hero" style={{ display: "grid", gridTemplateColumns: "1fr 220px", padding: 0, marginBottom: "20px" }}>

      {/* ── LEFT: stats ── */}
      <div style={{ padding: "26px 28px" }}>
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

      {/* ── RIGHT: portrait ── */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "0 var(--r-lg) var(--r-lg) 0", borderLeft: "1px solid var(--border)" }}>
        {!imgError && imgSrc ? (
          <Image
            src={imgSrc}
            alt={rank}
            fill
            style={{ objectFit: "cover", objectPosition: "50% 15%" }}
            onError={() => setImgError(true)}
            priority
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse 80% 80% at 50% 30%, ${glow.replace("1)", ".18)")}, transparent 70%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "60px", opacity: .15, fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, color: "var(--accent-violet-bright)" }}>
              LV.{level}
            </span>
          </div>
        )}

        {/* blend left edge into card */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to right, var(--bg-card) 0%, transparent 30%)",
        }} />

        {/* glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          boxShadow: `inset 0 0 40px ${glow.replace("1)", ".15)")}`,
        }} />

        {/* name overlay at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
          <div style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "17px", fontWeight: 700, letterSpacing: ".18em",
            color: "#e8f4ff", textTransform: "uppercase", lineHeight: 1,
            textShadow: `0 0 20px ${glow}, 0 2px 8px rgba(0,0,0,.9)`,
          }}>
            Fabricio
          </div>
          <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{
              fontSize: "9px", letterSpacing: ".2em", fontWeight: 700,
              color: "var(--accent-violet-bright)", fontFamily: "var(--font-space-grotesk), sans-serif",
              textShadow: `0 0 12px ${glow}`,
            }}>
              {rank}
            </span>
            <span style={{ width: "1px", height: "9px", background: "rgba(0,168,232,.4)" }} />
            <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: ".1em" }}>LV.{level}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
