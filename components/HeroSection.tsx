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
  if (level < 5)  return "Iniciante";
  if (level < 10) return "Aprendiz";
  if (level < 15) return "Aventureiro";
  if (level < 20) return "Veterano";
  if (level < 30) return "Especialista";
  if (level < 50) return "Mestre";
  return "Lendário";
}

function getCharEmoji(level: number): string {
  if (level < 5)  return "🌱";
  if (level < 10) return "⚔️";
  if (level < 15) return "🛡️";
  if (level < 20) return "🔮";
  if (level < 30) return "👑";
  return "🌟";
}

export function HeroSection({ levelInfo, xpToday }: HeroSectionProps) {
  const { level, currentLevelXP, nextLevelXP, progress, totalXP } = levelInfo;

  return (
    <div className="hero-grid">
      {/* Left: XP + Level */}
      <div className="hero">
        <div className="hero-top">
          {/* Circular level badge */}
          <div
            className="level-badge"
            style={{ "--p": progress } as React.CSSProperties}
          >
            <span className="lv-label">nível</span>
            <span className="lv-num num">{level}</span>
          </div>

          <div className="hero-meta">
            <div className="hero-title">
              <b>{getLevelTitle(level)}</b>
            </div>
            <div className="hero-sub">
              {totalXP.toLocaleString("pt-BR")} XP no total
            </div>
          </div>

          {xpToday > 0 && (
            <div className="hero-xptoday">
              <div className="big num">+{xpToday}</div>
              <div className="lbl">XP hoje</div>
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
              {nextLevelXP.toLocaleString("pt-BR")} para nível {level + 1}
            </span>
          </div>
          <div className="xp-track">
            <div
              className="xp-fill"
              style={{ "--xp": `${progress}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Right: Character stage */}
      <div className="hero-char">
        <span className="eyebrow">Personagem</span>
        <div className="char-stage">
          <div className="char-silhouette">{getCharEmoji(level)}</div>
          <div className="char-ring" />
        </div>
        <div className="char-cap">
          Nível <b>{level}</b> · {getLevelTitle(level)}
        </div>
      </div>
    </div>
  );
}
