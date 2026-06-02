"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Hoje", icon: "⚔️" },
  { href: "/activities", label: "Atividades", icon: "📋" },
  { href: "/achievements", label: "Conquistas", icon: "🏆" },
  { href: "/history", label: "Histórico", icon: "📊" },
];

export function Nav() {
  const path = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("dq-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.body.classList.add("theme-switching");
    document.documentElement.dataset.theme = next;
    setTheme(next);
    localStorage.setItem("dq-theme", next);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.body.classList.remove("theme-switching"))
    );
  }

  return (
    <nav
      style={{
        position: "relative",
        zIndex: 10,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "0 32px" }}>
        <div className="topbar" style={{ marginBottom: 0, height: "60px" }}>
          {/* Brand */}
          <div className="brand">
            <div className="mark">⚔️</div>
            <div>
              <div className="brand-title num">Daily Quest</div>
              <div className="brand-tag">RPG Habit Tracker</div>
            </div>
          </div>

          {/* Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {links.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    textDecoration: "none",
                    transition: "all .18s",
                    background: active ? "rgba(124,92,255,.15)" : "transparent",
                    color: active ? "var(--accent-violet-bright)" : "var(--text-muted)",
                    border: active ? "1px solid rgba(124,92,255,.25)" : "1px solid transparent",
                  }}
                >
                  <span>{l.icon}</span>
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Theme toggle */}
          <button className="theme-toggle" onClick={toggleTheme} title="Alternar tema">
            {theme === "dark" ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
