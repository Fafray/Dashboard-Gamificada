"use client";

import { useState, useCallback } from "react";
import { TITULOS, RARIDADES } from "@/lib/titulos";
import type { Raridade } from "@/lib/titulos";

const CYAN = "#00b8e8";

export interface TituloItem {
  id: string;
  nome: string;
  desc: string;
  emoji: string;
  raridade: Raridade;
  equipavel?: boolean;
  desbloqueado: boolean;
  progresso: { atual: number; total: number } | null;
}

interface GradeTitulosProps {
  titulos: TituloItem[];
  tituloAtivoId: string | null;
  totalDesbloqueados: number;
}

export function GradeTitulos({
  titulos,
  tituloAtivoId: initialAtivoId,
  totalDesbloqueados,
}: GradeTitulosProps) {
  const [ativoId, setAtivoId]   = useState(initialAtivoId);
  const [loading, setLoading]   = useState<string | null>(null);

  const equipar = useCallback(async (id: string) => {
    const novoId = ativoId === id ? null : id;
    setLoading(id);
    try {
      await fetch("/api/player/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: novoId }),
      });
      setAtivoId(novoId);
    } finally {
      setLoading(null);
    }
  }, [ativoId]);

  const ativo = TITULOS.find((t) => t.id === ativoId);
  const total = TITULOS.length;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">[ TÍTULOS ]</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", letterSpacing: ".06em" }}>
            {totalDesbloqueados} / {total} desbloqueados
          </p>
        </div>
      </div>

      {/* Título ativo */}
      {ativo && (
        <div className="section" style={{ marginTop: 0 }}>
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(0,184,232,.3)",
            borderRadius: "var(--r-lg)",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}>
            <span style={{ fontSize: "26px", lineHeight: 1 }}>{ativo.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "10px", letterSpacing: ".14em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Título Ativo
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "15px", marginTop: "2px" }}>
                {ativo.nome}
              </div>
              {ativo.bonus && (
                <div style={{ fontSize: "11px", color: CYAN, marginTop: "2px" }}>
                  {ativo.bonus.tipo === "xp_global" && `+${Math.round((ativo.bonus.mult ?? 0) * 100)}% XP global`}
                  {ativo.bonus.tipo === "xp_categoria" && `+${Math.round((ativo.bonus.mult ?? 0) * 100)}% XP em ${ativo.bonus.categoria}`}
                  {ativo.bonus.tipo === "reduz_decay" && "Decay reduzido à metade"}
                  {ativo.bonus.tipo === "streak_shield" && "Escudo de sequência ativo"}
                </div>
              )}
            </div>
            <button
              onClick={() => equipar(ativo.id)}
              disabled={!!loading}
              style={{
                fontSize: "11px", letterSpacing: ".1em", fontWeight: 600,
                background: "rgba(0,184,232,.1)", border: "1px solid rgba(0,184,232,.3)",
                borderRadius: "8px", padding: "6px 12px", color: CYAN,
                cursor: loading ? "default" : "pointer",
                textTransform: "uppercase",
                fontFamily: "var(--font-space-grotesk), sans-serif",
              }}
            >
              Desequipar
            </button>
          </div>
        </div>
      )}

      {/* Grade */}
      <div className="section" style={{ marginTop: ativo ? undefined : 0 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: "12px",
        }}>
          {titulos.map((t) => {
            const R      = RARIDADES[t.raridade];
            const isAtivo = ativoId === t.id;
            const pct    = t.progresso
              ? Math.min(100, Math.round((t.progresso.atual / t.progresso.total) * 100))
              : null;
            const isLoading = loading === t.id;
            const tDef = TITULOS.find((x) => x.id === t.id);
            const clicavel = t.desbloqueado && !!t.equipavel && !loading;

            return (
              <div
                key={t.id}
                onClick={() => clicavel && equipar(t.id)}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${t.desbloqueado ? `${R.cor}50` : "rgba(120,150,180,.12)"}`,
                  borderRadius: "12px",
                  padding: "14px",
                  cursor: clicavel ? "pointer" : "default",
                  transition: "border-color .18s, box-shadow .18s",
                  opacity: isLoading ? 0.6 : 1,
                  boxShadow: isAtivo ? `0 0 0 2px ${R.cor}` : undefined,
                }}
              >
                {/* Top row: emoji + rarity */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "10px",
                    background: t.desbloqueado ? `${R.cor}20` : "var(--bg-surface)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px",
                    filter: t.desbloqueado ? "none" : "grayscale(1) brightness(.35)",
                  }}>
                    {t.emoji}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <span style={{
                      fontSize: "8px", letterSpacing: ".14em", fontWeight: 700,
                      color: t.desbloqueado ? R.cor : `${R.cor}55`,
                      textTransform: "uppercase",
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                    }}>
                      {R.nome}
                    </span>
                    {t.desbloqueado && t.equipavel && (
                      <span style={{
                        fontSize: "8px", letterSpacing: ".1em",
                        color: isAtivo ? R.cor : "var(--text-muted)",
                        textTransform: "uppercase",
                      }}>
                        {isAtivo ? "✓ Ativo" : "Equipar"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Nome + desc */}
                <div style={{
                  fontSize: "14px", fontWeight: 600,
                  color: t.desbloqueado ? "var(--text-primary)" : "var(--text-muted)",
                  marginBottom: "4px",
                }}>
                  {t.nome}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {t.desc}
                </div>

                {/* Bônus (desbloqueado + equipável) */}
                {t.desbloqueado && tDef?.bonus && (
                  <div style={{ marginTop: "8px", fontSize: "10px", color: R.cor, letterSpacing: ".06em" }}>
                    {tDef.bonus.tipo === "xp_global" && `+${Math.round((tDef.bonus.mult ?? 0) * 100)}% XP global`}
                    {tDef.bonus.tipo === "xp_categoria" && `+${Math.round((tDef.bonus.mult ?? 0) * 100)}% XP em ${tDef.bonus.categoria}`}
                    {tDef.bonus.tipo === "reduz_decay" && "Decay reduzido à metade"}
                    {tDef.bonus.tipo === "streak_shield" && "Escudo de sequência"}
                  </div>
                )}

                {/* Barra de progresso (bloqueado) */}
                {!t.desbloqueado && pct !== null && t.progresso && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px",
                    }}>
                      <span>{t.progresso.atual} / {t.progresso.total}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: "3px", borderRadius: "2px", background: "rgba(120,150,180,.12)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: R.cor }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
