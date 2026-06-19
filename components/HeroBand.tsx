"use client";

import { useState } from "react";
import Image from "next/image";

const ATTR_COLORS: Record<string, string> = {
  FOR: "#f0556a",
  VIT: "#25d99a",
  AGI: "#ffce47",
  INT: "#45cdf0",
  PER: "#8b5cf6",
};

const ATTR_ORDER = ["FOR", "VIT", "AGI", "INT", "PER"] as const;
const ATTR_MAX = 20;

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

interface WeekDay {
  label: string;
  hasCheckin: boolean;
  isToday: boolean;
}

interface HeroBandProps {
  level: number;
  progress: number;
  xpTotal: number;
  xpRemaining: number;
  rank: string;
  classeLabel: string;
  portraitSrc: string;
  portraitGlow: string;
  atributos: Record<string, number>;
  weekDays: WeekDay[];
  xpToday: number;
  nearLevel: boolean;
}

export function HeroBand({
  level, progress, xpTotal, xpRemaining,
  rank, classeLabel, portraitSrc, portraitGlow,
  atributos, weekDays, xpToday, nearLevel,
}: HeroBandProps) {
  const [imgError, setImgError] = useState(false);

  return (
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
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit",
        background: "radial-gradient(90% 80% at 0% 0%, rgba(26,169,214,.11), transparent 55%)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit",
        backgroundImage: BRACKETS, opacity: .45 }} />

      {/* LEFT: Character */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
        <div style={{
          width: 96, height: 96, flexShrink: 0, borderRadius: "50%",
          background: "var(--bg-surface)",
          border: "2px solid var(--accent-violet)",
          overflow: "hidden", position: "relative",
          boxShadow: `0 0 16px ${portraitGlow}`,
        }}>
          {!imgError ? (
            <Image
              src={portraitSrc}
              alt={rank}
              fill
              style={{ objectFit: "cover", objectPosition: "50% 12%" }}
              onError={() => setImgError(true)}
              priority
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
              fontSize: 30, opacity: .4 }}>⚔</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            className="level-badge"
            style={{ "--p": progress, width: 56, height: 56 } as React.CSSProperties}
          >
            <span className="lv-label" style={{ fontSize: "7.5px", top: "13px" }}>LV</span>
            <span className="lv-num num" style={{ fontSize: "24px", marginTop: "3px" }}>{level}</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "18px", fontWeight: 700,
              letterSpacing: ".08em", textTransform: "uppercase", lineHeight: 1 }}>
              Fabricio
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "3px" }}>
              {classeLabel}
            </div>
            <div style={{
              display: "inline-flex", marginTop: "5px",
              background: "rgba(26,169,214,.08)", border: "1px solid rgba(26,169,214,.22)",
              borderRadius: "4px", padding: "1.5px 8px",
              fontSize: "9.5px", fontWeight: 700, letterSpacing: ".12em",
              color: "var(--accent-violet)", fontFamily: "var(--font-space-grotesk)",
            }}>
              {rank}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: XP + Attributes */}
      <div style={{ padding: "0 22px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
          <span>
            <b style={{ color: "var(--text-primary)", fontFamily: "var(--font-space-grotesk)" }}>
              {xpTotal.toLocaleString("pt-BR")}
            </b> XP
          </span>
          <span>
            → LV.{level + 1} faltam{" "}
            <b style={{ color: "var(--accent-violet-bright)" }}>
              {xpRemaining.toLocaleString("pt-BR")} XP
            </b>{" "}· {progress}%
          </span>
        </div>
        <div className="xp-track" style={{ height: "7px", marginBottom: "16px" }}>
          <div
            className={`xp-fill${nearLevel ? " near-level" : ""}`}
            style={{ "--xp": `${progress}%` } as React.CSSProperties}
          />
        </div>
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
        {xpToday > 0 && (
          <div style={{ position: "absolute", top: 0, right: "22px", textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "15px", fontWeight: 700,
              color: "var(--text-primary)", letterSpacing: ".02em" }}>+{xpToday}</div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: ".16em",
              textTransform: "uppercase", fontWeight: 700 }}>XP HOJE</div>
          </div>
        )}
      </div>

      {/* RIGHT: Stats */}
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
                  background: d.hasCheckin ? (d.isToday ? "rgba(69,205,240,.2)" : "rgba(37,217,154,.12)") : "var(--bg-surface)",
                  border: d.isToday ? "1px solid rgba(69,205,240,.6)" : d.hasCheckin ? "1px solid rgba(37,217,154,.35)" : "1px solid var(--border)",
                  display: "grid", placeItems: "center", fontSize: "9px",
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
  );
}
