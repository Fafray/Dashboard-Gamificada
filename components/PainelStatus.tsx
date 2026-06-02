import { multStreak, xpAteRebaixar } from "@/lib/gamification";

const CYAN = "#00b8e8";
const RED  = "#ef8a8a";

interface PainelStatusProps {
  maxStreak: number;
  doneCount: number;
  totalCount: number;
  totalXP: number;
  xpPenalidade?: number;
}

export function PainelStatus({
  maxStreak,
  doneCount,
  totalCount,
  totalXP,
  xpPenalidade = 24,
}: PainelStatusProps) {
  const mult  = multStreak(maxStreak);
  const meta  = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const queda = xpAteRebaixar(totalXP);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid rgba(0,140,200,.18)",
      borderRadius: "var(--r-lg)",
      padding: "18px 20px",
    }}>
      <div style={{
        color: CYAN,
        fontSize: "10px",
        letterSpacing: ".22em",
        fontWeight: 700,
        fontFamily: "var(--font-space-grotesk), sans-serif",
        textTransform: "uppercase",
        marginBottom: "16px",
      }}>
        [ STATUS DO DIA ]
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px",
        marginBottom: queda ? "12px" : 0,
      }}>
        {/* Bônus ativo */}
        <div style={{ background: "var(--bg-surface)", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".14em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Bônus Ativo
          </div>
          <div style={{
            fontSize: "28px", fontWeight: 700, color: CYAN, lineHeight: 1.1,
            marginTop: "4px", fontFamily: "var(--font-space-grotesk), sans-serif",
          }}>
            {mult.toFixed(2)}×
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            Sequência de {maxStreak} dia{maxStreak !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Meta de hoje */}
        {totalCount > 0 && (
          <div style={{ background: "var(--bg-surface)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".14em", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Meta de Hoje
            </div>
            <div style={{
              fontSize: "22px", fontWeight: 700, color: "var(--text-primary)",
              lineHeight: 1.1, marginTop: "4px",
              fontFamily: "var(--font-space-grotesk), sans-serif",
            }}>
              {doneCount}
              <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>
                {" "}/ {totalCount}
              </span>
            </div>
            <div style={{
              height: "4px", borderRadius: "3px",
              background: "rgba(0,140,200,.1)", overflow: "hidden", marginTop: "8px",
            }}>
              <div style={{
                height: "100%", width: `${meta}%`,
                background: `linear-gradient(90deg, ${CYAN}, #3b82f6)`,
                transition: "width .4s",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Risco de queda */}
      {queda && (
        <div style={{
          background: "rgba(226,75,74,.07)",
          border: "1px solid rgba(226,75,74,.28)",
          borderRadius: "10px",
          padding: "13px 16px",
        }}>
          <div style={{
            fontSize: "10px", letterSpacing: ".14em",
            color: RED, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase",
          }}>
            ⚠ Risco de Queda
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.7 }}>
            Pular hoje zera sua sequência e custa{" "}
            <b style={{ color: RED }}>−{xpPenalidade} XP</b>.{" "}
            Você está a{" "}
            <b style={{ color: RED }}>{queda.xp} XP</b> de ser rebaixado para{" "}
            <b style={{ color: RED }}>{queda.rankAbaixo}-RANK</b>.
          </div>
        </div>
      )}
    </div>
  );
}
