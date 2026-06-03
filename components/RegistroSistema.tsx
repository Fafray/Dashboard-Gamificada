export interface SystemEvent {
  id: number;
  tipo: string;
  texto: string;
  data: string;
  extra: Record<string, unknown> | null;
}

const COR_EVENTO: Record<string, string> = {
  nivel_up:     "#00b8e8",
  rank_up:      "#efa527",
  titulo:       "#9b8bff",
  nivel_down:   "#e24b4a",
  rank_down:    "#e24b4a",
  renascimento: "#efa527",
  checkin:      "rgba(120,150,180,.6)",
};

function formatData(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

interface RegistroSistemaProps {
  eventos: SystemEvent[];
}

export function RegistroSistema({ eventos }: RegistroSistemaProps) {
  if (eventos.length === 0) {
    return (
      <div className="card panel">
        <div className="panel-head">
          <div>
            <h3>Registro do Sistema</h3>
            <p className="panel-help">Timeline de eventos</p>
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "8px 0" }}>
          Nenhum evento registrado ainda. Complete missões para acumular história.
        </p>
      </div>
    );
  }

  return (
    <div className="card panel">
      <div className="panel-head">
        <div>
          <h3>Registro do Sistema</h3>
          <p className="panel-help">Últimos {eventos.length} eventos</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {eventos.map((e, i) => {
          const cor    = COR_EVENTO[e.tipo] ?? "rgba(120,150,180,.6)";
          const ultimo = i === eventos.length - 1;

          return (
            <div
              key={e.id}
              style={{
                display: "flex", gap: "12px",
                paddingBottom: ultimo ? 0 : "14px",
                position: "relative",
              }}
            >
              {/* Linha vertical conectora */}
              {!ultimo && (
                <div style={{
                  position: "absolute",
                  left: "5px", top: "14px", bottom: 0,
                  width: "1px",
                  background: "rgba(120,150,180,.15)",
                }} />
              )}

              {/* Dot */}
              <div style={{
                width: "11px", height: "11px", borderRadius: "50%",
                background: cor, flexShrink: 0, marginTop: "2px",
                boxShadow: `0 0 0 3px ${cor}22`,
              }} />

              {/* Texto */}
              <div style={{ flex: 1, color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.5 }}>
                {e.texto}
              </div>

              {/* Data */}
              <div style={{
                color: "var(--text-muted)", fontSize: "11px",
                flexShrink: 0, alignSelf: "flex-start",
              }}>
                {formatData(e.data)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
