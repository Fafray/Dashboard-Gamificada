"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  {
    href: "/", label: "Hoje",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/activities", label: "Hábitos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    href: "/agenda", label: "Agenda",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/planner", label: "Planner",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>
      </svg>
    ),
  },
  {
    href: "/history", label: "Histórico",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

const extraLinks = [
  {
    href: "/colecoes", label: "Coleções",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="4" rx="1"/>
        <rect x="2" y="10" width="20" height="4" rx="1"/>
        <rect x="2" y="17" width="20" height="4" rx="1"/>
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
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [agendaCount, setAgendaCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setAuthed(d.authed === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    router.refresh();
  }

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

  // Paleta dourada (Coleções) vs System (resto)
  const isColecoes    = path.startsWith("/colecoes");
  const navBg         = isColecoes ? "#0d0b07"               : "var(--bg-surface)";
  const navBorder     = isColecoes ? "#3a2f1a"               : "var(--border)";
  const navActive     = isColecoes ? "rgba(198,160,80,0.15)" : "var(--accent-violet)";
  const navActiveTxt  = isColecoes ? "#c6a050"               : "#14120e";
  const navMuted      = isColecoes ? "#a08a5a"               : "var(--text-muted)";
  const navLogoTxt    = isColecoes ? "#c6a050"               : "var(--accent-violet-bright)";
  const navActiveMob  = isColecoes ? "rgba(198,160,80,0.15)" : "rgba(201,144,63,.10)";
  const navActiveTxtM = isColecoes ? "#c6a050"               : "var(--accent-teal)";
  const navMutedMob   = isColecoes ? "#a08a5a"               : "var(--text-muted)";

  if (isMobile) {
    return (
      <>
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", flexDirection: "row", alignItems: "center",
        justifyContent: "space-around",
        padding: "8px 4px env(safe-area-inset-bottom, 12px)",
        background: isColecoes ? "#0d0b07" : "var(--bg-surface)",
        borderTop: `1px solid ${navBorder}`,
        boxShadow: "0 -4px 20px rgba(0,0,0,.3)",
        transition: "background .3s, border-color .3s",
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
                color: active ? navActiveTxtM : navMutedMob,
                textDecoration: "none", minWidth: "52px",
                background: active ? navActiveMob : "transparent",
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
          onClick={() => setDrawerOpen(true)}
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "3px", padding: "6px 8px", borderRadius: "12px",
            background: "transparent", border: "none", cursor: "pointer",
            color: navMutedMob, minWidth: "52px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
          <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: ".04em" }}>MAIS</span>
        </button>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,.6)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: isColecoes ? "#17130c" : "var(--bg-surface)",
              borderRadius: "20px 20px 0 0",
              padding: "16px 16px env(safe-area-inset-bottom, 20px)",
              boxShadow: "0 -8px 32px rgba(0,0,0,.4)",
              borderTop: `1px solid ${navBorder}`,
            }}
          >
            <div style={{ width: 36, height: 4, background: navBorder, borderRadius: 99, margin: "0 auto 16px" }} />
            {extraLinks.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link key={l.href} href={l.href} onClick={() => setDrawerOpen(false)} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px", borderRadius: 12,
                  background: active ? navActiveMob : "transparent",
                  color: active ? navActiveTxtM : (isColecoes ? "#f0e6d2" : "var(--text-primary)"),
                  textDecoration: "none", marginBottom: 4,
                }}>
                  {l.icon}
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{l.label}</span>
                </Link>
              );
            })}
            <div style={{ height: 1, background: navBorder, margin: "8px 0" }} />
            <button onClick={() => { toggleTheme(); setDrawerOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 14,
              width: "100%", padding: "12px 14px", borderRadius: 12,
              background: "transparent", border: "none", cursor: "pointer",
              color: isColecoes ? "#f0e6d2" : "var(--text-primary)", marginBottom: 4,
            }}>
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span style={{ fontSize: 15, fontWeight: 600 }}>Alternar tema</span>
            </button>
            {authed && (
              <button onClick={() => { handleLogout(); setDrawerOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "12px 14px", borderRadius: 12,
                background: "transparent", border: "none", cursor: "pointer",
                color: "#f87171",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Sair</span>
              </button>
            )}
          </div>
        </div>
      )}
      </>
    );
  }

  // Desktop — full-height left sidebar

  return (
    <nav style={{
      position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 50,
      width: 148,
      background: navBg, borderRight: `1px solid ${navBorder}`,
      display: "flex", flexDirection: "column", padding: "18px 10px 18px", gap: 3,
      transition: "background .3s, border-color .3s",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 20 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          display: "grid", placeItems: "center",
          fontSize: 17,
        }}>◈</div>
        <div>
          <div style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: 11.5, fontWeight: 700, letterSpacing: ".18em",
            color: navLogoTxt, lineHeight: 1,
          }}>DAILY QUEST</div>
        </div>
      </div>

      {/* Nav links */}
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        const isAgenda = l.href === "/agenda";
        return (
          <Link key={l.href} href={l.href} style={{
            position: "relative",
            display: "flex", alignItems: "center", gap: 9,
            height: 40, padding: "0 10px", borderRadius: 10,
            background: active ? navActive : "transparent",
            color: active ? navActiveTxt : navMuted,
            textDecoration: "none", transition: "background .15s, color .15s",
          }}>
            <span style={{ flexShrink: 0, width: 18, textAlign: "center", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {l.icon}
            </span>
            <span style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: 12.5, fontWeight: active ? 700 : 500, whiteSpace: "nowrap",
            }}>
              {l.label}
            </span>
            {isAgenda && agendaCount > 0 && (
              <span style={{
                marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 999,
                background: "var(--accent-red)", color: "white",
                fontSize: 9, fontWeight: 800, fontFamily: "var(--font-space-grotesk), sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px",
              }}>
                {agendaCount > 9 ? "9+" : agendaCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* Divider + extra links */}
      <div style={{ height: 1, background: navBorder, margin: "6px 0" }} />
      {extraLinks.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} style={{
            display: "flex", alignItems: "center", gap: 9,
            height: 40, padding: "0 10px", borderRadius: 10,
            background: active ? navActive : "transparent",
            color: active ? navActiveTxt : navMuted,
            textDecoration: "none", transition: "background .15s, color .15s",
          }}>
            <span style={{ flexShrink: 0, width: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {l.icon}
            </span>
            <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 12.5, fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>
              {l.label}
            </span>
          </Link>
        );
      })}

      {/* Theme toggle */}
      <button onClick={toggleTheme} title="Alternar tema" style={{
        marginTop: "auto",
        display: "flex", alignItems: "center", gap: 9,
        height: 40, padding: "0 10px", borderRadius: 10,
        background: "transparent", border: "none", cursor: "pointer",
        color: navMuted, transition: "color .15s",
      }}>
        <span style={{ flexShrink: 0, width: 18, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </span>
        <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 12.5, fontWeight: 500 }}>
          Tema
        </span>
      </button>

      {/* Logout */}
      {authed && (
        <button onClick={handleLogout} title="Sair" style={{
          display: "flex", alignItems: "center", gap: 9,
          height: 36, padding: "0 10px", borderRadius: 10,
          background: "transparent", border: "none", cursor: "pointer",
          color: navMuted, transition: "color .15s",
        }}>
          <span style={{ flexShrink: 0, width: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 12, fontWeight: 500 }}>
            Sair
          </span>
        </button>
      )}
    </nav>
  );
}
