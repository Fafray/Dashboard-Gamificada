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

function CharPortrait({ rank, level, classeCor }: { rank: string; level: number; classeCor?: string }) {
  const [imgError, setImgError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [posX, setPosX] = useState(() => typeof window === "undefined" ? 50 : Number(localStorage.getItem("portrait-x") ?? 50));
  const [posY, setPosY] = useState(() => typeof window === "undefined" ? 50 : Number(localStorage.getItem("portrait-y") ?? 50));
  const [zoom, setZoom] = useState(() => typeof window === "undefined" ? 100 : Number(localStorage.getItem("portrait-z") ?? 100));

  const imgSrc   = RANK_IMAGE[rank];
  const rankGlow = RANK_GLOW[rank] ?? "rgba(0,150,200,.6)";
  const glow     = classeCor ? `${classeCor}99` : rankGlow;

  function saveX(v: number) { setPosX(v); localStorage.setItem("portrait-x", String(v)); }
  function saveY(v: number) { setPosY(v); localStorage.setItem("portrait-y", String(v)); }
  function saveZ(v: number) { setZoom(v); localStorage.setItem("portrait-z", String(v)); }

  // posX/posY (0-100) controlam qual parte da imagem ampliada é visível
  const imgLeft = `${(100 - zoom) * posX / 100}%`;
  const imgTop  = `${(100 - zoom) * posY / 100}%`;

  return (
    <div style={{
      position: "relative", width: "100%", flex: 1,
      borderRadius: "var(--r-md)", overflow: "hidden",
      minHeight: "200px",
      background: "var(--bg-surface)",
      border: "1px solid rgba(0,168,232,.15)",
    }}>
      {!imgError && imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={rank}
          onError={() => setImgError(true)}
          style={{
            position: "absolute",
            width: `${zoom}%`,
            height: `${zoom}%`,
            objectFit: "cover",
            left: imgLeft,
            top: imgTop,
          }}
        />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 70% 80% at 50% 30%, ${glow.replace("1)", ".18)")}, transparent 70%),
                       radial-gradient(ellipse 50% 50% at 50% 100%, rgba(0,50,100,.4), transparent 60%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "80px", opacity: .18, fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, letterSpacing: ".1em", color: "var(--accent-violet-bright)" }}>
            LV.{level}
          </span>
        </div>
      )}

      {/* gradient overlay para texto */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(4,8,16,.95) 0%, rgba(4,8,16,.5) 30%, transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* lateral glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        boxShadow: `inset 0 0 40px ${glow.replace("1)", ".12)")}`,
      }} />

      {/* Botão de ajuste */}
      <button
        onClick={() => setEditing((e) => !e)}
        style={{
          position: "absolute", top: 8, right: 8, zIndex: 10,
          background: "rgba(0,0,0,.55)", border: "1px solid rgba(255,255,255,.15)",
          borderRadius: 6, padding: "3px 7px", cursor: "pointer",
          fontSize: "11px", color: "rgba(255,255,255,.7)", lineHeight: 1,
        }}
        title="Ajustar enquadramento"
      >
        ⊹
      </button>

      {/* Painel de ajuste */}
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
          <input type="range" min={100} max={300} value={zoom} onChange={(e) => saveZ(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-teal)" }} />
        </div>
      )}

      {/* Nome + rank overlay */}
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
            {rank}
          </span>
          <span style={{ width: "1px", height: "10px", background: "rgba(0,168,232,.3)" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: ".1em" }}>LV.{level}</span>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ levelInfo, xpToday, classeCor }: HeroSectionProps) {
  const { level, currentLevelXP, nextLevelXP, progress, totalXP } = levelInfo;
  const xpRemaining = nextLevelXP - currentLevelXP;
  const nearLevel   = progress >= 80;
  const rank        = getLevelTitle(level);

  return (
    <div className="hero-grid">
      {/* Left: XP + Level */}
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

      {/* Right: Character portrait */}
      <div className="hero-char" style={{ padding: "16px", gap: "0", borderColor: classeCor ? `${classeCor}40` : undefined }}>
        <span className="eyebrow" style={{ marginBottom: "10px" }}>[ JOGADOR ]</span>
        <CharPortrait rank={rank} level={level} classeCor={classeCor} />
      </div>
    </div>
  );
}
