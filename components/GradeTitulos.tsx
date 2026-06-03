"use client";

import { useState, useCallback } from "react";
import { TITULOS, TRILHAS, RARIDADES } from "@/lib/titulos";
import type { Titulo, TrilhaKey, PlayerEstado, TituloStats } from "@/lib/titulos";

const CYAN = "#00b8e8";

interface GradeTitulosProps {
  desbloqueados: string[];
  tituloAtivoId: string | null;
  player: PlayerEstado;
  stats: TituloStats;
  totalDesbloqueados: number;
}

export function GradeTitulos({
  desbloqueados: initialDesbloqueados,
  tituloAtivoId: initialAtivoId,
  player,
  stats,
  totalDesbloqueados,
}: GradeTitulosProps) {
  const [ativoId, setAtivoId] = useState(initialAtivoId);
  const [loading, setLoading] = useState<string | null>(null);
  const [selId, setSelId]     = useState<string | null>(null);

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
  const sel   = TITULOS.find((t) => t.id === selId);
  const total = TITULOS.length;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">[ TÍTULOS ]</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", letterSpacing: ".06em" }}>
            {totalDesbloqueados} / {total} · clique num título para ver detalhes
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
            display: "flex", alignItems: "center", gap: "14px",
          }}>
            <span style={{ fontSize: "24px", lineHeight: 1 }}>{ativo.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "10px", letterSpacing: ".14em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Título Ativo
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "15px", marginTop: "2px" }}>
                {ativo.nome}
              </div>
              {ativo.bonus && (
                <div style={{ fontSize: "11px", color: CYAN, marginTop: "2px" }}>
                  {ativo.bonus.tipo === "xp_global"    && `+${Math.round((ativo.bonus.mult ?? 0) * 100)}% XP global`}
                  {ativo.bonus.tipo === "xp_categoria" && `+${Math.round((ativo.bonus.mult ?? 0) * 100)}% XP em ${ativo.bonus.categoria}`}
                  {ativo.bonus.tipo === "reduz_decay"  && "Decay reduzido à metade"}
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

      {/* Trilhas */}
      <div className="section" style={{ marginTop: ativo ? undefined : 0 }}>
        {(Object.entries(TRILHAS) as [TrilhaKey, typeof TRILHAS[TrilhaKey]][]).map(([chave, tr]) => {
          const degraus = TITULOS.filter((t) => t.trilha === chave);
          const feitos  = degraus.filter((t) => initialDesbloqueados.includes(t.id)).length;

          return (
            <TrilhaRow
              key={chave}
              trilhaNome={tr.nome}
              trilhaIcone={tr.icone}
              degraus={degraus}
              desbloqueados={initialDesbloqueados}
              ativoId={ativoId}
              selId={selId}
              feitos={feitos}
              player={player}
              stats={stats}
              loading={loading}
              onEquipar={equipar}
              onSelect={setSelId}
            />
          );
        })}
      </div>

      {/* Painel de detalhe */}
      {sel && (
        <DetalhePanel
          titulo={sel}
          desbloqueado={initialDesbloqueados.includes(sel.id)}
          ativoId={ativoId}
          player={player}
          stats={stats}
          loading={loading}
          onEquipar={equipar}
          onFechar={() => setSelId(null)}
        />
      )}
    </div>
  );
}

// ─── Painel de detalhe ────────────────────────────────────────────────────────

interface DetalhePanelProps {
  titulo: Titulo;
  desbloqueado: boolean;
  ativoId: string | null;
  player: PlayerEstado;
  stats: TituloStats;
  loading: string | null;
  onEquipar: (id: string) => void;
  onFechar: () => void;
}

function DetalhePanel({ titulo: t, desbloqueado, ativoId, player, stats, loading, onEquipar, onFechar }: DetalhePanelProps) {
  const R = RARIDADES[t.raridade];
  const [atual, alvo] = t.progresso(player, stats);
  const pct = Math.round((Math.min(atual, alvo) / alvo) * 100);
  const status = desbloqueado ? "DESBLOQUEADO" : atual > 0 ? "EM PROGRESSO" : "BLOQUEADO";
  const isAtivo = ativoId === t.id;

  return (
    <div style={{
      position: "sticky", bottom: "12px",
      background: "var(--bg-card)",
      border: `1px solid ${R.cor}55`,
      borderRadius: "var(--r-lg)",
      padding: "16px 18px",
      boxShadow: `0 0 24px ${R.cor}22`,
      marginTop: "16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "26px", lineHeight: 1 }}>{t.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "16px" }}>{t.nome}</div>
            <div style={{ fontSize: "10px", letterSpacing: ".12em", color: R.cor, fontWeight: 600, textTransform: "uppercase", marginTop: "2px" }}>
              {R.nome}
            </div>
          </div>
        </div>
        <button onClick={onFechar} style={{ color: "var(--text-muted)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "10px", lineHeight: 1.6 }}>
        {t.desc}
      </div>

      {t.bonus && (
        <div style={{
          marginTop: "10px", fontSize: "12px", color: R.cor,
          background: `${R.cor}12`, border: `1px solid ${R.cor}30`,
          borderRadius: "8px", padding: "7px 12px",
        }}>
          🎁 Bônus equipável:{" "}
          {t.bonus.tipo === "xp_global"    && `+${Math.round((t.bonus.mult ?? 0) * 100)}% XP global`}
          {t.bonus.tipo === "xp_categoria" && `+${Math.round((t.bonus.mult ?? 0) * 100)}% XP em ${t.bonus.categoria}`}
          {t.bonus.tipo === "reduz_decay"  && "Decay reduzido à metade"}
        </div>
      )}

      <div style={{ marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "5px" }}>
          <span style={{ letterSpacing: ".1em", textTransform: "uppercase", color: desbloqueado ? R.cor : "var(--text-muted)" }}>{status}</span>
          <span>{Math.min(atual, alvo)} / {alvo}</span>
        </div>
        <div style={{ height: "5px", borderRadius: "3px", background: "var(--bg-surface)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: R.cor, borderRadius: "3px", transition: "width .3s" }} />
        </div>
      </div>

      {desbloqueado && t.equipavel && (
        <button
          onClick={() => onEquipar(t.id)}
          disabled={!!loading}
          style={{
            marginTop: "12px", width: "100%",
            padding: "9px", borderRadius: "8px",
            fontSize: "12px", fontWeight: 700, letterSpacing: ".08em",
            background: isAtivo ? `${R.cor}18` : R.cor,
            color: isAtivo ? R.cor : "#0a1628",
            border: isAtivo ? `1px solid ${R.cor}` : "none",
            cursor: loading ? "default" : "pointer",
            textTransform: "uppercase",
            fontFamily: "var(--font-space-grotesk), sans-serif",
          }}
        >
          {isAtivo ? "✓ Equipado — Clique para desequipar" : "Equipar título"}
        </button>
      )}
    </div>
  );
}

// ─── TrilhaRow ────────────────────────────────────────────────────────────────

interface TrilhaRowProps {
  trilhaNome: string;
  trilhaIcone: string;
  degraus: Titulo[];
  desbloqueados: string[];
  ativoId: string | null;
  selId: string | null;
  feitos: number;
  player: PlayerEstado;
  stats: TituloStats;
  loading: string | null;
  onEquipar: (id: string) => void;
  onSelect: (id: string) => void;
}

function TrilhaRow({
  trilhaNome, trilhaIcone, degraus, desbloqueados,
  ativoId, selId, feitos, player, stats, loading, onEquipar, onSelect,
}: TrilhaRowProps) {
  return (
    <div style={{
      display: "flex", gap: "16px", alignItems: "flex-start",
      padding: "18px 0", borderBottom: "1px solid rgba(120,150,180,.08)",
    }}>
      <div style={{ width: "110px", flexShrink: 0, paddingTop: "6px" }}>
        <div style={{
          color: "var(--text-primary)", fontSize: "12px", fontWeight: 700,
          letterSpacing: ".08em", textTransform: "uppercase",
          fontFamily: "var(--font-space-grotesk), sans-serif",
        }}>
          {trilhaIcone} {trilhaNome}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "3px" }}>
          {feitos} / {degraus.length}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: "4px" }}>
        {degraus.map((t, i) => {
          const R           = RARIDADES[t.raridade];
          const done        = desbloqueados.includes(t.id);
          const emProgresso = !done && i === feitos;
          const isAtivo     = ativoId === t.id;
          const isSel       = selId === t.id;
          const [atual, alvo] = t.progresso(player, stats);

          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && (
                <div style={{
                  width: "24px", height: "2px",
                  background: desbloqueados.includes(degraus[i - 1].id) ? R.cor : "rgba(120,150,180,.15)",
                  flexShrink: 0,
                }} />
              )}

              <div
                onClick={() => onSelect(isSel ? "" : t.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: "72px", flexShrink: 0, cursor: "pointer",
                  opacity: loading === t.id ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? R.cor : emProgresso ? `${R.cor}18` : "var(--bg-surface)",
                  border: done ? "none" : emProgresso ? `2px solid ${R.cor}` : "1px solid rgba(120,150,180,.18)",
                  boxShadow: isSel
                    ? `0 0 0 3px ${R.cor}88`
                    : isAtivo
                    ? `0 0 0 3px ${R.cor}55`
                    : emProgresso
                    ? `0 0 10px ${R.cor}44`
                    : "none",
                  transition: "all .18s",
                  color: done ? "#0a1628" : "var(--text-muted)",
                  fontWeight: 700,
                }}>
                  {done ? (
                    <span style={{ color: "#0a1628" }}>✓</span>
                  ) : emProgresso ? (
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: R.cor, display: "block" }} />
                  ) : (
                    <span style={{ fontSize: "12px", opacity: 0.4 }}>🔒</span>
                  )}
                </div>

                <div style={{
                  fontSize: "9.5px", fontWeight: done || emProgresso ? 600 : 400,
                  color: done || emProgresso ? "var(--text-primary)" : "var(--text-muted)",
                  marginTop: "6px", textAlign: "center", lineHeight: 1.2,
                  width: "68px", overflow: "hidden",
                }}>
                  {t.nome}
                </div>

                <div style={{
                  fontSize: "8.5px", marginTop: "3px",
                  color: done || emProgresso ? R.cor : "rgba(120,150,180,.5)",
                  textAlign: "center",
                }}>
                  {done
                    ? (t.equipavel ? (isAtivo ? "✓ Ativo" : "Equipar") : RARIDADES[t.raridade].nome)
                    : emProgresso
                    ? `${atual}/${alvo}`
                    : RARIDADES[t.raridade].nome}
                </div>

                {emProgresso && atual > 0 && atual < alvo && (
                  <div style={{
                    width: "48px", height: "2px", borderRadius: "2px",
                    background: "rgba(120,150,180,.12)", overflow: "hidden", marginTop: "4px",
                  }}>
                    <div style={{ height: "100%", width: `${Math.round((atual / alvo) * 100)}%`, background: R.cor }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
