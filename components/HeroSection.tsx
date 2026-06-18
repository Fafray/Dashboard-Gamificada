"use client";

import Image from "next/image";
import { useState } from "react";
import { getPortrait } from "@/lib/portraits";

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

function CharPortrait({ level, classeCor }: { level: number; classeCor?: string }) {
  const [imgError, setImgError] = useState(false);
  const portrait = getPortrait(level);
  const glow = classeCor ? `${classeCor}99` : portrait.glowColor;

  return (
    <div style={{
      position: "relative", width: "100%", flex: 1,
      borderRadius: "var(--r-md)", overflow: "hidden",
      minHeight: "200px",
      background: "var(--bg-surface)",
      border: "1px solid rgba(0,168,232,.15)",
    }}>
      {!imgError ? (
        <Image
          key={portrait.src}
          src={portrait.src}
          alt={portrait.rank}
          fill
          style={{ objectFit: "cover", objectPosition: "top center", transition: "opacity .6s ease" }}
          onError={() => setImgError(true)}
          priority
        />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 70% 80% at 50% 30%, ${portrait.glowColor.replace("1)", ".18)")}, transparent 70%),
                       radial-gradient(ellipse 50% 50% at 50% 100%, rgba(0,50,100,.4), transparent 60%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: "80px", opacity: .18,
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 700, letterSpacing: ".1em", color: "var(--accent-violet-bright)",
          }}>
            LV.{level}
          </span>
        </div>
      )}

      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(4,8,16,.95) 0%, rgba(4,8,16,.6) 35%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        boxShadow: `inset 0 0 40px ${glow.replace("1)", ".12)")}`,
      }} />

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
        <div style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: "20px", fontWeight: 700, letterSpacing: ".18em",
          color: "#e8f4ff",
          textShadow: `0 0 20px ${glow}, 0 2px 8px rgba(0,0,0,.8)`,
          textTransform: "uppercase", lineHeight: 1,
        }}>
          Fabricio
        </div>
        <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "10px", letterSpacing: ".2em", fontWeight: 700,
            color: "var(--accent-violet-bright)",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            textShadow: `0 0 12px ${glow}`,
          }}>
            {portrait.rank}
          </span>
          <span style={{ width: "1px", height: "10px", background: "rgba(0,168,232,.3)" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: ".1em" }}>
            LV.{level}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ levelInfo, xpToday, classeCor }: HeroSectionProps) {
  const { level, currentLevelXP, nextLevelXP, progress, totalXP } = levelInfo;
  const xpRemaining = nextLevelXP - currentLevelXP;
  const nearLevel = progress >= 80;
  const portrait = getPortrait(level);

  return (
    <div className="hero-grid">
      {/* Left: XP + Level */}
      <div className="hero">
        <div className="hero-top">
          <div
            className="level-badge"
            style={{ "--p": progress } as React.CSSProperties}
          >
            <span className="lv-label">LV</span>
            <span className="lv-num num">{level}</span>
          </div>

          <div className="hero-meta">
            <div className="hero-title">
              <b>{portrait.rank}</b>
            </div>
            <div className="hero-sub">
              {totalXP.toLocaleString("pt-BR")} XP ACUMULADO
            </div>
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
            <span className="cur">
              <b className="num">{currentLevelXP.toLocaleString("pt-BR")}</b> XP
            </span>
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

      {/* Right: Character portrait */}
      <div className="hero-char" style={{ padding: "16px", gap: "0", borderColor: classeCor ? `${classeCor}40` : undefined }}>
        <span className="eyebrow" style={{ marginBottom: "10px" }}>[ JOGADOR ]</span>
        <CharPortrait level={level} classeCor={classeCor} />
      </div>
    </div>
  );
}

export { CharPortrait };
