"use client";

import { useEffect, useRef } from "react";

interface OverlayProps {
  show: boolean;
  mode: "levelup" | "achievement";
  level?: number;
  achievementEmoji?: string;
  achievementName?: string;
  achievementDesc?: string;
  onClose: () => void;
}

function launchConfetti(colors: string[]) {
  for (let i = 0; i < 90; i++) {
    const c = document.createElement("div");
    c.className = "confetti-piece";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.opacity = String(0.6 + Math.random() * 0.4);
    const dur = 2200 + Math.random() * 2000;
    const delay = Math.random() * 600;
    const drift = -80 + Math.random() * 160;
    const spin = 360 + Math.random() * 720;
    document.body.appendChild(c);
    c.animate(
      [
        { transform: "translate(0,-20px) rotate(0deg)", opacity: "1" },
        { transform: `translate(${drift}px, 100vh) rotate(${spin}deg)`, opacity: "0.9" },
      ],
      { duration: dur, delay, easing: "cubic-bezier(.3,.6,.4,1)", fill: "forwards" }
    );
    setTimeout(() => c.remove(), dur + delay + 100);
  }
}

function buildRays(container: HTMLElement) {
  container.innerHTML = "";
  for (let i = 0; i < 14; i++) {
    const ray = document.createElement("div");
    ray.className = "ray";
    ray.style.transform = `translateX(-50%) rotate(${i * (360 / 14)}deg)`;
    ray.style.opacity = String(0.1 + Math.random() * 0.2);
    container.appendChild(ray);
  }
}

export function LevelUpOverlay({
  show, mode, level, achievementEmoji, achievementName, achievementDesc, onClose,
}: OverlayProps) {
  const burstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    if (burstRef.current) buildRays(burstRef.current);
    const colors =
      mode === "levelup"
        ? ["#7c5cff", "#22d3ee", "#2fe0a6", "#f7b733"]
        : ["#f7b733", "#f472b6", "#fbbf24", "#fff1c2"];
    launchConfetti(colors);
  }, [show, mode]);

  return (
    <div
      className={`overlay${show ? " show" : ""}`}
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className={`celebrate${mode === "achievement" ? " ach-mode" : ""}`}>
        <div className="burst" ref={burstRef} />

        <div className="eyebrow" style={{ marginBottom: "4px" }}>
          {mode === "levelup" ? "Subiu de nível" : "Conquista desbloqueada"}
        </div>

        <div className="lvl-ring">
          <span className="n">
            {mode === "levelup" ? level : achievementEmoji}
          </span>
        </div>

        {mode === "levelup" ? (
          <>
            <h2>Nível <b>{level}</b> alcançado!</h2>
            <p>Sua jornada continua. Novas conquistas no horizonte.</p>
          </>
        ) : (
          <>
            <h2>{achievementName}</h2>
            <p>{achievementDesc}</p>
          </>
        )}

        <button className="btn-ok" onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  );
}
