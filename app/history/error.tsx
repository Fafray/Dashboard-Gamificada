"use client";

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page">
      <p className="eyebrow">Registros</p>
      <div
        style={{
          marginTop: "24px",
          background: "rgba(226,75,74,.07)",
          border: "1px solid rgba(226,75,74,.3)",
          borderRadius: "var(--r-lg)",
          padding: "24px",
        }}
      >
        <p
          style={{
            color: "#ef8a8a",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Erro ao carregar a página
        </p>
        <pre
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            marginBottom: "16px",
          }}
        >
          {error.message}
        </pre>
        <button
          onClick={reset}
          style={{
            fontSize: "12px",
            padding: "8px 18px",
            borderRadius: "8px",
            background: "rgba(0,184,232,.12)",
            border: "1px solid rgba(0,184,232,.4)",
            color: "#00b8e8",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
