"use client";

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

function getCharEmoji(level: number): string {
  if (level < 5)  return "👤";
  if (level < 10) return "⚔️";
  if (level < 15) return "🗡️";
  if (level < 20) return "🛡️";
  if (level < 30) return "🏹";
  if (level < 50) return "⚡";
  if (level < 80) return "🌀";
  return "👁️";
}

export function HeroSection({ levelInfo, xpToday }: HeroSectionProps) {
  const { level, currentLevelXP, nextLevelXP, progress, totalXP } = levelInfo;
  const xpRemaining = nextLevelXP - currentLevelXP;
  const nearLevel = progress >= 80;

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
              <b>{getLevelTitle(level)}</b>
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

        {/* XP bar */}
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

      {/* Right: Character stage */}
      <div className="hero-char">
        <span className="eyebrow">[ JOGADOR ]</span>
        <div className="char-stage">
          <div className="char-silhouette">{getCharEmoji(level)}</div>
          <div className="char-ring" />
        </div>
        <div className="char-cap">
          LV.<b>{level}</b> · {getLevelTitle(level)}
        </div>
      </div>
    </div>
  );
}
