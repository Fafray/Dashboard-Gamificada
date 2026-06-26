"use client";

import { useState } from "react";
import type { Book, Perfume } from "@/lib/db";
import { BibliotecaClient } from "./BibliotecaClient";
import { AcervoClient } from "./AcervoClient";

type BookRow    = Omit<Book,    "cover_image">;
type PerfumeRow = Omit<Perfume, "photo" | "pyramid_image">;

const S       = "#0a0612";
const SC      = "#120a1f";
const PRIMARY = "#b388ff";
const INK2    = "#8a6db3";
const OUTLINE = "#2a1f3d";
const LABEL   = "var(--font-space-grotesk), var(--font-manrope), sans-serif";

const TABS = [
  { key: "livros",    label: "Livros"    },
  { key: "perfumes",  label: "Perfumes"  },
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
    <div style={{ background: S, minHeight: "100vh" }}>
      {/* Seletor principal — sticky no topo */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: S,
        borderBottom: `1px solid ${OUTLINE}`,
        padding: "14px 52px",
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: 4, borderRadius: 999,
          border: `1px solid ${OUTLINE}`,
          background: SC,
          gap: 2,
        }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "9px 28px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: "none",
                  fontFamily: LABEL,
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  background: active ? "rgba(179,136,255,0.18)" : "transparent",
                  color: active ? PRIMARY : INK2,
                  boxShadow: active ? "inset 0 0 0 1px rgba(179,136,255,0.35)" : "none",
                  transition: "all .15s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo — troca sem re-montar (display:none preserva estado) */}
      <div style={{ display: tab === "livros" ? "block" : "none" }}>
        <BibliotecaClient initialBooks={initialBooks} />
      </div>
      <div style={{ display: tab === "perfumes" ? "block" : "none" }}>
        <AcervoClient initialPerfumes={initialPerfumes} />
      </div>
    </div>
  );
}
