"use client";

import { useEffect, useState } from "react";

interface Achievement {
  key: string;
  name: string;
  description: string;
  emoji: string;
}

interface AchievementToastProps {
  achievements: Achievement[];
  onDismiss: () => void;
}

export function AchievementToast({ achievements, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [achievements, onDismiss]);

  if (achievements.length === 0) return null;

  return (
    <div
      className="fixed top-6 right-6 z-50 space-y-2"
      style={{ transition: "opacity 0.3s", opacity: visible ? 1 : 0 }}
    >
      {achievements.map((a) => (
        <div
          key={a.key}
          className="achievement-toast flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--accent-gold)",
            boxShadow: "0 0 24px rgba(245,158,11,0.3)",
            minWidth: "280px",
          }}
        >
          <span className="text-3xl">{a.emoji}</span>
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: "var(--accent-gold)" }}>
              CONQUISTA DESBLOQUEADA!
            </p>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {a.name}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {a.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
