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
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (achievements.length === 0) return;
    requestAnimationFrame(() => setShowing(true));
    const timer = setTimeout(() => {
      setShowing(false);
      setTimeout(onDismiss, 500);
    }, 4200);
    return () => clearTimeout(timer);
  }, [achievements, onDismiss]);

  if (achievements.length === 0) return null;

  return (
    <div className="toast-wrap">
      {achievements.map((a) => (
        <div key={a.key} className={`toast${showing ? " show" : ""}`}>
          <div className="ic">{a.emoji}</div>
          <div>
            <div className="t-eyebrow">Conquista</div>
            <div className="t-name">{a.name}</div>
            <div className="t-desc">{a.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
