"use client";

import { useState, useCallback } from "react";
import { TITULOS, TRILHAS, RARIDADES } from "@/lib/titulos";
import type { Titulo, TrilhaKey, PlayerEstado, TituloStats } from "@/lib/titulos";

function chaseHint(trilha: string, id: string, restam: number): string {
  const d = (n: number, s: string) => `${n} ${s}${n !== 1 ? "s" : ""}`;
  switch (trilha) {
    case "sequencia":
      return restam === 1 ? "Mais 1 dia — quase lá!" : `Mantenha a sequência por mais ${d(restam, "dia")}`;
    case "dedicacao":
      return restam === 1 ? "Mais 1 check-in para desbloquear!" : `${d(restam, "check-in")} — faça missões hoje`;
    case "ascensao":
      return `${d(restam, "nível")} para alcançar`;
    case "disciplina":
      if (id === "dia_perfeito") return "Complete todas as missões do dia";
      return `${d(restam, "dia")} sem falhar`;
    case "maestria":
      return "Invista pontos de atributo";
    case "habitos":
      if (id === "madrugador") return "Faça um check-in antes das 7h";
      if (id === "coruja") return "Faça um check-in após as 22h";
      if (id === "pentatleta") return "Missões de 5 categorias em um dia";
      return `${d(restam, "missão")} em um único dia`;
    case "lendas":
      return "Evento especial necessário";
    case "vocacao":
      return `${d(restam, "dia")} na mesma classe`;
    case "microhabito":
      if (id === "micro_primeiro_minimo") return "Faça um check-in mínimo";
      if (id.startsWith("micro_escalada")) return "Evolua um hábito mínimo";
      if (id === "micro_ancora_30") return "Complete o hábito-âncora hoje";
      return `${d(restam, "dia")} restante`;
    default:
      return `${d(restam, "restante")}`;
  }
}

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

  const emProgresso = TITULOS.filter((t) => {
    if (initialDesbloqueados.includes(t.id)) return false;
    const [atual] = t.progresso(player, stats);
    return atual > 0;
  }).slice(0, 6);

  const chaseAgora = TITULOS
    .filter((t) => !initialDesbloqueados.includes(t.id))
    .map((t) => {
      const [atual, alvo] = t.progresso(player, stats);
      return { t, atual, alvo, pct: alvo > 0 ? atual / alvo : 0 };
    })
    .filter(({ pct }) => pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">[ TÍTULOS ]</p>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>
            Títulos
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
            {totalDesbloqueados} / {total} desbloqueados · clique para ver detalhes
          </p>
        </div>
      </div>

      {/* Título ativo */}
      {ativo && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid rgba(0,184,232,.3)",
          borderRadius: "var(--r-lg)", padding: "14px 18px",
          display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px",
        }}>
          <span style={{ fontSize: "24px", lineHeight: 1 }}>{ativo.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: ".14em", color: "var(--text-muted)", textTransform: "uppercase" }}>Título Ativo</div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "15px", marginTop: "2px" }}>{ativo.nome}</div>
            {ativo.bonus && (
              <div style={{ fontSize: "11px", color: "var(--accent-violet-bright)", marginTop: "2px" }}>
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
              borderRadius: "8px", padding: "6px 12px", color: "var(--accent-violet-bright)",
              cursor: loading ? "default" : "pointer", textTransform: "uppercase",
              fontFamily: "var(--font-space-grotesk), sans-serif",
            }}
          >
            Desequipar
          </button>
        </div>
      )}

      {/* ── Chase agora ── */}
      {chaseAgora.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <div style={{ width: "3px", height: "16px", borderRadius: "2px", background: "var(--accent-gold)", flexShrink: 0 }} />
            <h2 style={{ margin: 0, fontSize: "14px", letterSpacing: ".08em", textTransform: "uppercase" }}>Chase agora</h2>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>mais perto de desbloquear</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {chaseAgora.map(({ t, atual, alvo, pct }) => {
              const R = RARIDADES[t.raridade];
              const hint = chaseHint(t.trilha, t.id, alvo - Math.min(atual, alvo));
              return (
                <div
                  key={t.id}
                  onClick={() => setSelId(selId === t.id ? null : t.id)}
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${R.cor}33`,
                    borderLeft: `3px solid ${R.cor}`,
                    borderRadius: "var(--r-md)",
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{t.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{t.nome}</span>
                        <span style={{ marginLeft: "7px", fontSize: "9.5px", color: R.cor, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "var(--font-space-grotesk)" }}>
                          {R.nome}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-space-grotesk)", fontWeight: 600, flexShrink: 0 }}>
                        {Math.min(atual, alvo)}/{alvo}
                      </span>
                    </div>
                    <div style={{ height: "3px", borderRadius: "2px", background: "var(--bg-surface)", overflow: "hidden", marginBottom: "6px" }}>
                      <div style={{ height: "100%", width: `${Math.round(pct * 100)}%`, background: R.cor, borderRadius: "2px", transition: "width .4s" }} />
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      ↗ {hint}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Em progresso ── */}
      {emProgresso.length > 0 && (
        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "13px" }}>
            Em progresso
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
            {emProgresso.map((t) => {
              const R = RARIDADES[t.raridade];
              const [atual, alvo] = t.progresso(player, stats);
              const pct = Math.round((Math.min(atual, alvo) / alvo) * 100);
              return (
                <div
                  key={t.id}
                  onClick={() => setSelId(selId === t.id ? null : t.id)}
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${R.cor}55`,
                    borderRadius: 13,
                    padding: "18px 16px",
                    boxShadow: `0 0 22px ${R.cor}14`,
                    position: "relative", overflow: "hidden",
                    cursor: "pointer",
                    transition: "border-color .15s, box-shadow .15s",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${R.cor}, transparent)`, pointerEvents: "none" }} />
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(70% 50% at 15% -5%, ${R.cor}1a, transparent 55%)` }} />
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 11, flexShrink: 0,
                      background: `${R.cor}26`, border: `1px solid ${R.cor}60`,
                      display: "grid", placeItems: "center", fontSize: 22,
                    }}>{t.emoji}</div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: R.cor, marginBottom: 3 }}>{R.nome}</div>
                      <div style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: "var(--text-primary)" }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                        {t.desc.split("·")[0]?.trim() ?? t.trilha}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
                      <span>Progresso</span>
                      <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, color: "var(--text-primary)" }}>
                        {Math.min(atual, alvo)} / {alvo}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: "var(--bg-base)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: R.cor, borderRadius: 999, boxShadow: `0 0 8px ${R.cor}80`, transition: "width .4s" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Trilhas ── */}
      <div>
        <div style={{ fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "20px" }}>
          Trilhas
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
      background: "var(--bg-card)", border: `1px solid ${R.cor}55`,
      borderRadius: "var(--r-lg)", padding: "16px 18px",
      boxShadow: `0 0 24px ${R.cor}22`, marginTop: "16px",
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
            cursor: loading ? "default" : "pointer", textTransform: "uppercase",
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
  const pctFeitos = degraus.length > 0 ? (feitos / degraus.length) * 100 : 0;

  // Cor representativa da trilha (pega a cor do primeiro título desbloqueado, senão do primeiro)
  const firstR = RARIDADES[degraus[0]?.raridade ?? "comum"];
  const trilhaCor = firstR?.cor ?? "var(--accent-teal)";

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 13, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: `${trilhaCor}1a`, border: `1px solid ${trilhaCor}4d`,
          display: "grid", placeItems: "center", fontSize: 17,
        }}>
          {trilhaIcone}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase",
          }}>{trilhaNome}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {feitos} / {degraus.length} desbloqueados
          </div>
        </div>
        {/* Mini progress bar */}
        <div style={{ height: 5, width: 120, borderRadius: 999, background: "var(--border)", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ height: "100%", width: `${pctFeitos}%`, background: trilhaCor, borderRadius: 999, transition: "width .5s" }} />
        </div>
      </div>

      {/* Nodes */}
      <div style={{ padding: "24px 20px 28px", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", minWidth: `${degraus.length * 88 + (degraus.length - 1) * 36}px` }}>
          {degraus.map((t, i) => {
            const R           = RARIDADES[t.raridade];
            const done        = desbloqueados.includes(t.id);
            const emProgresso = !done && i === feitos;
            const isAtivo     = ativoId === t.id;
            const isSel       = selId === t.id;
            const [atual, alvo] = t.progresso(player, stats);
            const prevDone    = i > 0 && desbloqueados.includes(degraus[i - 1].id);
            const isLocked    = !done && !emProgresso;

            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center" }}>
                {/* Connector */}
                {i > 0 && (
                  <div style={{
                    width: 36, height: 2, flexShrink: 0,
                    background: prevDone && done
                      ? "var(--accent-violet)"
                      : prevDone && emProgresso
                      ? "linear-gradient(to right, var(--accent-violet), #1d3050)"
                      : "#1d3050",
                    marginTop: 0,
                  }} />
                )}

                <div
                  onClick={() => onSelect(isSel ? "" : t.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    width: 88, flexShrink: 0, cursor: "pointer",
                    opacity: loading === t.id ? 0.6 : 1,
                  }}
                >
                  {/* Node circle — 58px */}
                  <div style={{
                    width: 58, height: 58, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", gap: 1,
                    background: done
                      ? `${R.cor}26`
                      : emProgresso
                      ? `${R.cor}1a`
                      : "var(--bg-surface)",
                    border: done
                      ? `2px solid ${R.cor}`
                      : emProgresso
                      ? `2px solid ${R.cor}`
                      : "2px solid var(--border)",
                    boxShadow: isSel
                      ? `0 0 0 3px ${R.cor}88`
                      : isAtivo
                      ? `0 0 0 3px ${R.cor}55`
                      : done
                      ? `0 0 16px ${R.cor}4d`
                      : emProgresso
                      ? `0 0 14px ${R.cor}55`
                      : "none",
                    position: "relative",
                    transition: "all .18s",
                    opacity: isLocked ? 0.45 : 1,
                    animation: emProgresso ? "pulse 2.4s ease-in-out infinite" : "none",
                  }}>
                    {/* Emoji inside circle */}
                    <span style={{ fontSize: done ? 22 : 18, lineHeight: 1 }}>{t.emoji}</span>
                    {/* Counter for in-progress */}
                    {emProgresso && (
                      <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9.5, fontWeight: 700, color: R.cor, lineHeight: 1 }}>
                        {atual}/{alvo}
                      </span>
                    )}
                    {/* Check badge for done */}
                    {done && (
                      <div style={{
                        position: "absolute", bottom: -2, right: -2,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "var(--accent-green)", border: "2px solid var(--bg-card)",
                        display: "grid", placeItems: "center",
                        fontSize: 9, color: "#04121c", fontWeight: 800,
                      }}>✓</div>
                    )}
                  </div>

                  {/* Progress bar under in-progress node */}
                  {emProgresso && atual > 0 && atual < alvo && (
                    <div style={{ width: 58, height: 3, background: "var(--border)", borderRadius: 999, overflow: "hidden", marginTop: 5 }}>
                      <div style={{ height: "100%", width: `${Math.round((atual / alvo) * 100)}%`, background: R.cor, borderRadius: 999 }} />
                    </div>
                  )}

                  {/* Name */}
                  <div style={{ marginTop: done ? 10 : emProgresso ? 6 : 15, textAlign: "center" }}>
                    <div style={{
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      fontSize: 10.5, fontWeight: 700,
                      color: done ? R.cor : emProgresso ? R.cor : "var(--text-muted)",
                    }}>{t.nome}</div>
                    <div style={{
                      fontSize: 9, marginTop: 1, textAlign: "center",
                      color: done || emProgresso ? R.cor : "var(--text-muted)",
                      opacity: emProgresso ? 0.7 : 1,
                    }}>
                      {done && t.equipavel ? (isAtivo ? "✓ Ativo" : "Equipar") : R.nome}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
