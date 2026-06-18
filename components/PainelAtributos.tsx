"use client";

import { useState, useEffect, useCallback } from "react";
import { ATTR_ORDER, ATTR_LABELS, CLASSES, CLASSE_VERSATIL } from "@/lib/attributes";
import type { Atributos, ClasseInfo } from "@/lib/attributes";

const CYAN  = "#00b8e8";
const MAX   = 20;

function pontoRadar(i: number, r: number, cx = 110, cy = 110): [number, number] {
  const ang = (-90 + i * 72) * (Math.PI / 180);
  return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
}

interface PainelAtributosProps {
  initialAtributos: Atributos;
  initialPontos: number;
  initialClasse: ClasseInfo;
  onClasseChange?: (classe: ClasseInfo) => void;
  compact?: boolean;
}

export function PainelAtributos({
  initialAtributos,
  initialPontos,
  initialClasse,
  onClasseChange,
  compact = false,
}: PainelAtributosProps) {
  const [atributos, setAtributos] = useState<Atributos>(initialAtributos);
  const [pontos, setPontos]       = useState(initialPontos);
  const [classe, setClasse]       = useState<ClasseInfo>(initialClasse);
  const [loading, setLoading]     = useState<string | null>(null);

  useEffect(() => { setAtributos(initialAtributos); }, [initialAtributos]);
  useEffect(() => { setPontos(initialPontos); }, [initialPontos]);
  useEffect(() => { setClasse(initialClasse); }, [initialClasse]);

  const investir = useCallback(async (attr: string) => {
    if (pontos <= 0 || loading) return;
    setLoading(attr);
    try {
      const res  = await fetch("/api/player/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attr }),
      });
      const data = await res.json();
      setAtributos(data.atributos);
      setPontos(data.pontos_disponiveis);
      setClasse(data.classe);
      onClasseChange?.(data.classe);
    } finally {
      setLoading(null);
    }
  }, [pontos, loading, onClasseChange]);

  const aneis = [1, 0.66, 0.33];
  const temPontos = pontos > 0;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: `1px solid ${temPontos ? "rgba(0,184,232,.4)" : "rgba(0,140,200,.18)"}`,
      borderRadius: "var(--r-lg)",
      padding: "18px 20px",
      position: "relative",
      boxShadow: temPontos ? "0 0 24px rgba(0,184,232,.1)" : "var(--shadow-card)",
      transition: "border-color .3s, box-shadow .3s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: CYAN, fontSize: "10px", letterSpacing: ".22em", fontWeight: 700, fontFamily: "var(--font-space-grotesk), sans-serif", textTransform: "uppercase" }}>
            [ ATRIBUTOS ]
          </span>
          <span style={{
            fontSize: "11px", letterSpacing: ".06em", fontWeight: 600,
            color: classe.cor, fontFamily: "var(--font-space-grotesk), sans-serif",
            textShadow: `0 0 12px ${classe.cor}88`,
            textTransform: "uppercase",
          }}>
            {classe.nome}
          </span>
        </div>
        {temPontos && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(0,184,232,.12)", border: "1px solid rgba(0,184,232,.4)",
            borderRadius: "8px", padding: "4px 10px",
          }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: ".12em", textTransform: "uppercase" }}>PONTOS</span>
            <span style={{ fontSize: "18px", fontWeight: 700, color: CYAN, fontFamily: "var(--font-space-grotesk), sans-serif", lineHeight: 1 }}>
              {pontos}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "180px 1fr", gap: "20px", alignItems: "center" }}>
        {/* Radar — hidden in compact mode */}
        {!compact && <svg viewBox="0 0 220 220" width="100%" role="img" aria-label="Radar de atributos">
          {aneis.map((f, idx) => (
            <polygon key={idx} fill="none" stroke="rgba(0,140,200,.15)" strokeWidth="1"
              points={ATTR_ORDER.map((_, i) => pontoRadar(i, 78 * f).map((n) => n.toFixed(1)).join(",")).join(" ")}
            />
          ))}
          {ATTR_ORDER.map((_, i) => {
            const [x, y] = pontoRadar(i, 78);
            return <line key={i} x1="110" y1="110" x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(0,140,200,.13)" strokeWidth="1" />;
          })}
          <polygon
            fill={`${classe.cor}22`} stroke={classe.cor} strokeWidth="1.6"
            points={ATTR_ORDER.map((k, i) => pontoRadar(i, (78 * Math.min(atributos[k], MAX)) / MAX).map((n) => n.toFixed(1)).join(",")).join(" ")}
            style={{ transition: "all .4s" }}
          />
          {ATTR_ORDER.map((k, i) => {
            const [x, y] = pontoRadar(i, (78 * Math.min(atributos[k], MAX)) / MAX);
            return <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill={classe.cor} style={{ transition: "all .4s" }} />;
          })}
          {ATTR_ORDER.map((k, i) => {
            const [x, y] = pontoRadar(i, 94);
            return (
              <text key={k} x={x.toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="middle"
                fill="rgba(0,180,232,.6)" fontSize="11"
                fontFamily="var(--font-space-grotesk), sans-serif"
              >{k}</text>
            );
          })}
        </svg>}

        {/* Barras + botões */}
        <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
          {ATTR_ORDER.map((k) => {
            const pct   = Math.round((Math.min(atributos[k], MAX) / MAX) * 100);
            const pode  = temPontos && !loading;
            const isLoading = loading === k;
            const attrClasse = Object.entries(CLASSES).find(([, v]) => v.cor === classe.cor)?.[0];
            const barColor = k === attrClasse ? classe.cor : CYAN;

            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: "32px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-space-grotesk), sans-serif", letterSpacing: ".06em" }}>
                  {k}
                </span>
                <div style={{ flex: 1, height: "5px", borderRadius: "3px", background: "rgba(0,140,200,.1)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "3px",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                    transition: "width .4s cubic-bezier(.2,.7,.2,1)",
                    boxShadow: `0 0 8px ${barColor}66`,
                  }} />
                </div>
                <span style={{ width: "22px", textAlign: "right", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                  {atributos[k]}
                </span>
                <button
                  onClick={() => investir(k)}
                  disabled={!pode}
                  title={ATTR_LABELS[k]}
                  style={{
                    width: "26px", height: "26px", padding: 0, borderRadius: "6px",
                    fontSize: "15px", lineHeight: 1, cursor: pode ? "pointer" : "default",
                    background: pode ? "rgba(0,184,232,.12)" : "transparent",
                    border: `1px solid ${pode ? "rgba(0,184,232,.4)" : "rgba(0,140,200,.15)"}`,
                    color: pode ? CYAN : "var(--text-muted)",
                    transition: "all .15s",
                    opacity: isLoading ? .5 : 1,
                  }}
                >
                  {isLoading ? "·" : "+"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
