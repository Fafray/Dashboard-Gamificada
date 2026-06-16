"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  {
    href: "/", label: "Sistema",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/activities", label: "Missões",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    href: "/achievements", label: "Títulos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
  {
    href: "/history", label: "Registros",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: "/agenda", label: "Agenda",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export function Nav() {
  const path = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [agendaCount, setAgendaCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dq-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  useEffect(() => {
    fetch("/api/agenda/today-count")
      .then((r) => r.json())
      .then((d) => setAgendaCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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

  if (isMobile) {
    return (
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", flexDirection: "row", alignItems: "center",
        justifyContent: "space-around",
        padding: "8px 4px env(safe-area-inset-bottom, 12px)",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -4px 20px rgba(0,0,0,.3)",
      }}>
        {links.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          const isAgenda = l.href === "/agenda";
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                position: "relative",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", padding: "6px 8px", borderRadius: "12px",
                color: active ? "var(--accent-teal)" : "var(--text-muted)",
                textDecoration: "none", minWidth: "52px",
                background: active ? "rgba(0,240,192,.08)" : "transparent",
                transition: "color .15s, background .15s",
              }}
            >
              {l.icon}
              <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: ".04em" }}>
                {l.label.toUpperCase()}
              </span>
              {isAgenda && agendaCount > 0 && (
                <span style={{
                  position: "absolute", top: "4px", right: "4px",
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: "#ef4444", color: "white",
                  fontSize: "8px", fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {agendaCount > 9 ? "9+" : agendaCount}
                </span>
              )}
            </Link>
          );
        })}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "3px", padding: "6px 8px", borderRadius: "12px",
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--text-muted)", minWidth: "52px",
          }}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: ".04em" }}>
            TEMA
          </span>
        </button>
      </nav>
    );
  }

  // Desktop — vertical pill
  return (
    <nav style={{
      position: "fixed", left: "20px", top: "50%", transform: "translateY(-50%)",
      zIndex: 50, display: "flex", flexDirection: "column",
      alignItems: "center", gap: "2px", padding: "10px 8px",
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: "28px",
      boxShadow: "0 8px 32px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.12)",
    }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "18px", color: "var(--accent-violet-bright)", marginBottom: "2px",
      }}>◈</div>

      <div style={{ width: "22px", height: "1px", background: "var(--border)", margin: "4px 0 6px" }} />

      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        const isAgenda = l.href === "/agenda";
        return (
          <Link key={l.href} href={l.href} title={l.label} style={{
            position: "relative", width: "42px", height: "42px",
            borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center",
            background: active ? "var(--text-primary)" : "transparent",
            color: active ? "var(--bg-base)" : "var(--text-muted)",
            textDecoration: "none", transition: "background .15s, color .15s",
          }}>
            {l.icon}
            {isAgenda && agendaCount > 0 && (
              <span style={{
                position: "absolute", top: "4px", right: "4px",
                width: "14px", height: "14px", borderRadius: "50%",
                background: "#ef4444", color: "white", fontSize: "8px", fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {agendaCount > 9 ? "9+" : agendaCount}
              </span>
            )}
          </Link>
        );
      })}

      <div style={{ width: "22px", height: "1px", background: "var(--border)", margin: "6px 0 4px" }} />

      <button onClick={toggleTheme} title="Alternar tema" style={{
        width: "42px", height: "42px", borderRadius: "14px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "none", cursor: "pointer",
        color: "var(--text-muted)", transition: "color .15s",
      }}>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    </nav>
  );
}
