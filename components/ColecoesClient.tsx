"use client";

import { useState } from "react";
import type { Book, Perfume } from "@/lib/db";
import { BibliotecaClient } from "./BibliotecaClient";
import { AcervoClient } from "./AcervoClient";

type BookRow    = Omit<Book,    "cover_image">;
type PerfumeRow = Omit<Perfume, "photo" | "pyramid_image">;

const LABEL = "var(--font-space-grotesk), var(--font-manrope), sans-serif";

const TABS = [
  { key: "livros",   label: "Livros"   },
  { key: "perfumes", label: "Perfumes" },
] as const;

type Tab = typeof TABS[number]["key"];

export function ColecoesClient({
  initialBooks,
  initialPerfumes,
}: {
  initialBooks:    BookRow[];
  initialPerfumes: PerfumeRow[];
}) {
  const [tab, setTab] = useState<Tab>("livros");

  return (
    <div className="colecoes-page" style={{ background: "var(--col-bg)", minHeight: "100vh" }}>
      {/* Seletor principal — sticky no topo */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--col-bg)",
        borderBottom: "1px solid var(--col-border)",
        padding: "14px 52px",
        display: "flex", alignItems: "center",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: 4, borderRadius: 999,
          border: "1px solid var(--col-border)",
          background: "var(--col-surface)",
          gap: 2,
        }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "9px 28px", borderRadius: 999, cursor: "pointer", border: "none",
                  fontFamily: LABEL, fontSize: 11, fontWeight: active ? 700 : 500,
                  letterSpacing: ".1em", textTransform: "uppercase",
                  background: active ? "var(--col-primary-a)" : "transparent",
                  color: active ? "var(--col-primary)" : "var(--col-ink2)",
                  boxShadow: active ? "inset 0 0 0 1px var(--col-primary-ring)" : "none",
                  transition: "all .15s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo — display:none preserva estado interno */}
      <div style={{ display: tab === "livros" ? "block" : "none" }}>
        <BibliotecaClient initialBooks={initialBooks} />
      </div>
      <div style={{ display: tab === "perfumes" ? "block" : "none" }}>
        <AcervoClient initialPerfumes={initialPerfumes} />
      </div>
    </div>
  );
}
