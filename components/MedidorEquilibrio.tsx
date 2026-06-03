import { CATEGORIA_ATRIBUTO } from "@/lib/attributes";

const ATRIBUTOS = ["FOR", "VIT", "AGI", "INT", "PER"] as const;
type AttrKey = typeof ATRIBUTOS[number];

const COR_ATTR: Record<AttrKey, string> = {
  FOR: "#e24b4a",
  VIT: "#1d9e75",
  AGI: "#efa527",
  INT: "#9b8bff",
  PER: "#3b82f6",
};

interface ActivityLike {
  categoria: string | null;
}

interface MedidorEquilibrioProps {
  atividades: ActivityLike[];
}

export function MedidorEquilibrio({ atividades }: MedidorEquilibrioProps) {
  const cont = Object.fromEntries(ATRIBUTOS.map((a) => [a, 0])) as Record<AttrKey, number>;

  for (const a of atividades) {
    if (!a.categoria) continue;
    const attr = CATEGORIA_ATRIBUTO[a.categoria] as AttrKey | undefined;
    if (attr && attr in cont) cont[attr]++;
  }

  const max    = Math.max(1, ...Object.values(cont));
  const vazios = ATRIBUTOS.filter((a) => cont[a] === 0);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)",
      padding: "14px 18px",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px",
      }}>
        <span style={{
          color: "var(--text-primary)", fontSize: "10px", fontWeight: 700,
          letterSpacing: ".18em", textTransform: "uppercase",
          fontFamily: "var(--font-space-grotesk), sans-serif",
        }}>
          Equilíbrio da Build
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          pra onde seus hábitos apontam
        </span>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
        {ATRIBUTOS.map((a) => {
          const n = cont[a];
          const h = Math.round((n / max) * 42);
          const cor = COR_ATTR[a];
          return (
            <div key={a} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: n ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
                {n}
              </span>
              <div style={{ width: "100%", height: "42px", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: `${Math.max(h, 3)}px`,
                  borderRadius: "4px 4px 0 0",
                  background: n ? cor : "transparent",
                  border: n ? "none" : `1px dashed rgba(239,165,39,.4)`,
                  transition: "height .3s",
                }} />
              </div>
              <span style={{ fontSize: "10px", color: n ? cor : "#efa527", fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 600 }}>
                {a}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "11px", color: "#efa527", marginTop: "11px" }}>
        {vazios.length > 0
          ? `⚠ ${vazios.join(", ")} sem nenhum hábito — sua build tá torta pra esse lado.`
          : "✓ Build equilibrada entre os atributos."}
      </div>
    </div>
  );
}
