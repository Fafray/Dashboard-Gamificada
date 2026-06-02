"use client";

import { useEffect, useState } from "react";

const CYAN  = "#00b8e8";
const GREEN = "#1d9e75";
const RED   = "#ef8a8a";

function msAteMeiaNoite(): number {
  const agora = new Date();
  const fim   = new Date(agora);
  fim.setHours(24, 0, 0, 0);
  return fim.getTime() - agora.getTime();
}

interface MissaoDoSistemaProps {
  doneCount: number;
  totalCount: number;
  comboXp: number;
  xpPenalidade?: number;
}

export function MissaoDoSistema({
  doneCount,
  totalCount,
  comboXp,
  xpPenalidade = 24,
}: MissaoDoSistemaProps) {
  const [restante, setRestante] = useState(msAteMeiaNoite());

  useEffect(() => {
    const id = setInterval(() => setRestante(msAteMeiaNoite()), 1000);
    return () => clearInterval(id);
  }, []);

  const s   = Math.floor(restante / 1000);
  const hms = [
    Math.floor(s / 3600),
    Math.floor((s % 3600) / 60),
    s % 60,
  ].map((n) => String(n).padStart(2, "0")).join(":");

  const pct      = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const urgente  = restante < 3 * 3_600_000;
  const completo = doneCount === totalCount && totalCount > 0;

  const borderColor = completo
    ? "rgba(29,158,117,.4)"
    : urgente
    ? "rgba(239,138,138,.35)"
    : "rgba(0,184,232,.28)";

  const accentColor = completo ? GREEN : urgente ? RED : CYAN;

  return (
    <div style={{
      background: completo
        ? "rgba(29,158,117,.05)"
        : "rgba(0,184,232,.04)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--r-lg)",
      padding: "15px 18px",
    }}>
      {/* Topo */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px", alignItems: "flex-start",
      }}>
        <div>
          <div style={{
            color: accentColor,
            fontSize: "10px", letterSpacing: ".22em", fontWeight: 700,
            fontFamily: "var(--font-space-grotesk), sans-serif",
            textTransform: "uppercase",
          }}>
            ⚡ MISSÃO DO SISTEMA
          </div>
          <div style={{
            color: "var(--text-primary)", fontSize: "16px",
            fontWeight: 600, marginTop: "5px",
            fontFamily: "var(--font-space-grotesk), sans-serif",
          }}>
            Dia Perfeito
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>
            {completo
              ? `Todas as ${totalCount} missões concluídas ✓`
              : `${doneCount} / ${totalCount} missões — feche antes da meia-noite`}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{
            color: completo ? GREEN : urgente ? RED : CYAN,
            fontSize: completo ? "28px" : "22px",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            letterSpacing: ".06em",
            lineHeight: 1,
          }}>
            {completo ? "✓" : hms}
          </div>
          {!completo && (
            <div style={{
              color: "var(--text-muted)", fontSize: "9px",
              letterSpacing: ".14em", textTransform: "uppercase", marginTop: "3px",
            }}>
              {urgente ? "⚠ RESTANTE" : "RESTANTE"}
            </div>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      {!completo && (
        <div style={{
          height: "4px", borderRadius: "3px",
          background: "rgba(0,140,200,.1)", overflow: "hidden",
          margin: "13px 0 10px",
        }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: `linear-gradient(90deg, ${CYAN}, #3b82f6)`,
            transition: "width .4s",
          }} />
        </div>
      )}

      {/* Rodapé */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        flexWrap: "wrap", gap: "8px",
        marginTop: completo ? "10px" : 0,
      }}>
        <span style={{
          fontSize: "11px",
          color: completo ? GREEN : "#2fd09a",
          background: completo ? "rgba(29,158,117,.12)" : "rgba(47,208,154,.08)",
          border: `1px solid ${completo ? "rgba(29,158,117,.35)" : "rgba(47,208,154,.25)"}`,
          borderRadius: "6px", padding: "3px 9px",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          letterSpacing: ".06em",
        }}>
          {completo ? `✓ +${comboXp} XP de combo` : `Recompensa: +${comboXp} XP combo`}
        </span>
        {!completo && (
          <span style={{ fontSize: "11px", color: RED, alignSelf: "center" }}>
            ⚠ Falhar zera a streak e tira −{xpPenalidade} XP
          </span>
        )}
      </div>
    </div>
  );
}
