const CYAN = "#00b8e8";
const RED  = "#e24b4a";

interface DataPoint {
  date: string;
  nivel: number;
}

interface EvolucaoNivelProps {
  historico: DataPoint[];
}

export function EvolucaoNivel({ historico }: EvolucaoNivelProps) {
  if (historico.length === 0) return null;

  const W   = 600;
  const H   = 140;
  const pad = 28;

  const levels  = historico.map((d) => Number(d.nivel));
  const maxL    = Math.max(...levels, 2);
  const minL    = Math.max(1, Math.min(...levels) - 1);
  const range   = maxL - minL || 1;

  const X = (i: number) =>
    pad + i * ((W - 2 * pad) / Math.max(historico.length - 1, 1));
  const Y = (v: number) =>
    (H - pad) - ((v - minL) / range) * (H - 2 * pad);

  const pts = historico
    .map((d, i) => `${X(i).toFixed(1)},${Y(d.nivel).toFixed(1)}`)
    .join(" ");

  const areaPoints = [
    `${X(0).toFixed(1)},${(H - pad).toFixed(1)}`,
    ...historico.map((d, i) => `${X(i).toFixed(1)},${Y(d.nivel).toFixed(1)}`),
    `${X(historico.length - 1).toFixed(1)},${(H - pad).toFixed(1)}`,
  ].join(" ");

  return (
    <div className="card panel">
      <div className="panel-head">
        <div>
          <h3>Evolução de Nível</h3>
          <p className="panel-help">Histórico de mudanças</p>
        </div>
        <div className="heat-stats">
          <div className="hs">
            <b style={{ color: CYAN }}>LV.{levels[levels.length - 1]}</b>
            <span>nível atual</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Evolução de nível ao longo do tempo"
        style={{ display: "block" }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line
            key={i}
            x1={pad} y1={(H - pad - f * (H - 2 * pad)).toFixed(1)}
            x2={W - pad} y2={(H - pad - f * (H - 2 * pad)).toFixed(1)}
            stroke="rgba(0,140,200,.08)" strokeWidth="1"
          />
        ))}

        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={`${CYAN}12`}
        />

        {/* Line */}
        <polyline
          points={pts}
          fill="none"
          stroke={CYAN}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points */}
        {historico.map((d, i) => {
          const caiu = i > 0 && d.nivel < historico[i - 1].nivel;
          return (
            <circle
              key={i}
              cx={X(i).toFixed(1)}
              cy={Y(d.nivel).toFixed(1)}
              r={caiu ? "4" : "2.5"}
              fill={caiu ? RED : CYAN}
            >
              <title>{`${d.date}: LV.${d.nivel}`}</title>
            </circle>
          );
        })}
      </svg>

      {/* Legenda de queda */}
      {levels.some((v, i) => i > 0 && v < levels[i - 1]) && (
        <div style={{
          marginTop: "10px", fontSize: "11px", color: RED,
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <span style={{
            display: "inline-block", width: "8px", height: "8px",
            borderRadius: "50%", background: RED, flexShrink: 0,
          }} />
          Pontos vermelhos indicam queda de nível
        </div>
      )}
    </div>
  );
}
