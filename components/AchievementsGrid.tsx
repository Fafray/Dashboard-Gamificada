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
    <div className="page">
      <div style={{ marginBottom: "8px" }}>
        <p className="eyebrow">Conquistas</p>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>
          {unlockedCount}/{total} desbloqueadas
        </h1>
      </div>

      {/* Stats compactos */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
        <div style={{ flex: 1, height: "6px", borderRadius: "999px", background: "var(--bg-surface)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "999px", width: `${globalProgress}%`,
            background: "linear-gradient(90deg, var(--accent-violet), var(--accent-teal))",
            transition: "width .7s cubic-bezier(.2,.7,.2,1)",
          }} />
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0 }}>
          <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{unlockedCount}</span>
          {" / "}{total} · {globalProgress}%
        </span>
      </div>

      {/* Desbloqueadas */}
      {unlocked.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h2>✨ Desbloqueadas</h2>
            <span style={{ fontSize: "13px", color: "var(--accent-gold)" }}>{unlocked.length}</span>
          </div>
          <div className="ach-grid">
            {unlocked.map((a) => (
              <AchCard key={a.key} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {/* Bloqueadas — lista densa */}
      {locked.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h2>Bloqueadas</h2>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{locked.length}</span>
          </div>
          <div className="ach-locked-list">
            {locked.map((a) => (
              <AchLockedRow key={a.key} achievement={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AchCard({ achievement: a }: { achievement: AchievementItem }) {
  const progress = a.progress;
  const pct = progress ? Math.min(100, Math.floor((progress.current / progress.target) * 100)) : null;

  return (
    <div className={`ach ${a.unlocked ? "unlocked" : "locked"}`}>
      <span className="emoji">{a.emoji}</span>
      <div className="an">{a.name}</div>
      <div className="ad">{a.description}</div>

      {!a.unlocked && progress && (
        <div className="ach-progress">
          <div className="ach-progress-label">
            <span>{progress.current}/{progress.target}</span>
            <span>{pct}%</span>
          </div>
          <div className="ach-progress-bar">
            <div className="ach-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {a.unlocked && a.unlockedAt && (
        <div className="ach-date">{formatDate(a.unlockedAt)}</div>
      )}
    </div>
  );
}

function AchLockedRow({ achievement: a }: { achievement: AchievementItem }) {
  const progress = a.progress;
  const pct = progress ? Math.min(100, Math.floor((progress.current / progress.target) * 100)) : null;

  return (
    <div className="ach-locked-row">
      <span className="emoji">{a.emoji}</span>
      <div className="info">
        <div className="an">{a.name}</div>
        {progress ? (
          <>
            <div className="ach-progress-bar">
              <div className="ach-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="prog-label">{progress.current}/{progress.target}</div>
          </>
        ) : (
          <div className="prog-label">🔒</div>
        )}
      </div>
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
