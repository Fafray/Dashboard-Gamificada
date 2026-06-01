"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Hoje", icon: "⚔️" },
  { href: "/activities", label: "Atividades", icon: "📋" },
  { href: "/achievements", label: "Conquistas", icon: "🏆" },
];

export function Nav() {
  const path = usePathname();

  return (
    <nav
      className="flex items-center gap-1 px-4 border-b"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)", height: "48px" }}
    >
      <span className="font-bold text-sm mr-4" style={{ color: "var(--accent-violet-bright)" }}>
        DailyQuest
      </span>
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={
              active
                ? { background: "var(--accent-violet)" + "20", color: "var(--accent-violet-bright)" }
                : { color: "var(--text-muted)" }
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
