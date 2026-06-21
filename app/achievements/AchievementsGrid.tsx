"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AchievementItem {
  key: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number } | null;
}

interface AchievementsGridProps {
  achievements: AchievementItem[];
  unlockedCount: number;
  total: number;
}

export function AchievementsGrid({ achievements, unlockedCount, total }: AchievementsGridProps) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const globalProgress = Math.floor((unlockedCount / total) * 100);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Conquistas
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {unlockedCount}/{total} desbloqueadas
        </p>
      </div>

      {/* Global progress */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          <span>Progresso geral</span>
          <span>{globalProgress}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ background: "var(--bg-surface)" }}>
          <div
            className="h-full rounded-full xp-bar-fill transition-all duration-700"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
        <div className="flex mt-3 gap-4">
          <Stat label="Desbloqueadas" value={unlockedCount} color="var(--accent-gold)" />
          <Stat label="Bloqueadas" value={total - unlockedCount} color="var(--text-muted)" />
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--accent-gold)" }}
          >
            ✨ Desbloqueadas ({unlocked.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {unlocked.map((a) => (
              <AchievementCard key={a.key} achievement={a} />
            ))}
          </div>
        </section>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Bloqueadas ({locked.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {locked.map((a) => (
              <AchievementCard key={a.key} achievement={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AchievementCard({ achievement: a }: { achievement: AchievementItem }) {
  const progress = a.progress;
  const pct = progress ? Math.min(100, Math.floor((progress.current / progress.target) * 100)) : null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${a.unlocked ? "var(--accent-gold)40" : "var(--border)"}`,
        opacity: a.unlocked ? 1 : 0.7,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow for unlocked */}
      {a.unlocked && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, var(--accent-gold), transparent)",
          }}
        />
      )}

      {/* Emoji */}
      <div
        className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl"
        style={{
          background: a.unlocked ? "var(--accent-gold)15" : "var(--bg-surface)",
          filter: a.unlocked ? "none" : "grayscale(1) brightness(0.5)",
          fontSize: "1.75rem",
        }}
      >
        {a.emoji}
      </div>

      {/* Info */}
      <div className="flex-1">
        <p
          className="font-semibold text-sm leading-tight mb-1"
          style={{ color: a.unlocked ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          {a.name}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {a.description}
        </p>
      </div>

      {/* Progress bar for locked with metrics */}
      {!a.unlocked && progress && (
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            <span>{progress.current}/{progress.target}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: "var(--bg-surface)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: "var(--accent-violet)",
              }}
            />
          </div>
        </div>
      )}

      {/* Unlock date for unlocked */}
      {a.unlocked && a.unlockedAt && (
        <p className="text-xs" style={{ color: "var(--accent-gold)", opacity: 0.7 }}>
          {formatDate(a.unlockedAt)}
        </p>
      )}

      {/* Lock icon for locked without progress */}
      {!a.unlocked && !progress && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          🔒 Condição especial
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function formatDate(isoStr: string): string {
  try {
    return format(new Date(isoStr), "d 'de' MMM 'de' yyyy", { locale: ptBR });
  } catch {
    return "";
  }
}
