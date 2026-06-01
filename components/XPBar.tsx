"use client";

interface XPBarProps {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
  totalXP: number;
  xpToday: number;
}

export function XPBar({ level, currentLevelXP, nextLevelXP, progress, totalXP, xpToday }: XPBarProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl text-white font-bold text-lg"
            style={{
              background: "linear-gradient(135deg, var(--accent-violet), var(--accent-blue))",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            {level}
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              NÍVEL
            </p>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {getLevelTitle(level)}
            </p>
          </div>
        </div>

        <div className="text-right">
          {xpToday > 0 && (
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--accent-green)" }}>
              +{xpToday} XP hoje
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {totalXP.toLocaleString()} XP total
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div
          className="w-full h-3 rounded-full overflow-hidden"
          style={{ background: "var(--bg-surface)" }}
        >
          <div
            className="h-full rounded-full xp-bar-fill transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{currentLevelXP} XP</span>
          <span>{nextLevelXP} XP para nível {level + 1}</span>
        </div>
      </div>
    </div>
  );
}

function getLevelTitle(level: number): string {
  if (level < 5) return "Iniciante";
  if (level < 10) return "Aprendiz";
  if (level < 15) return "Aventureiro";
  if (level < 20) return "Veterano";
  if (level < 30) return "Especialista";
  if (level < 50) return "Mestre";
  return "Lendário";
}
