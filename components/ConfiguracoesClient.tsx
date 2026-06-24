"use client";

import { useState, useRef } from "react";
import type { Portrait } from "@/lib/portraits";
import { compressImage } from "@/lib/image";

interface Props {
  portraits: Portrait[];
  overrides: Record<string, string>;
}

export function ConfiguracoesClient({ portraits, overrides: initialOverrides }: Props) {
  const [overrides, setOverrides] = useState(initialOverrides);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleUpload(rank: string, file: File) {
    setUploading(rank);
    try {
      const image = await compressImage(file, 400, 0.85);
      await fetch("/api/portraits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank, image }),
      });
      setOverrides((prev) => ({ ...prev, [rank]: image }));
    } finally {
      setUploading(null);
    }
  }

  async function handleReset(rank: string) {
    if (!confirm(`Restaurar retrato padrão para ${rank}?`)) return;
    await fetch(`/api/portraits/${encodeURIComponent(rank)}`, { method: "DELETE" });
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[rank];
      return next;
    });
  }

  return (
    <div style={{ padding: "24px 16px 100px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>⚙️ Configurações</h1>
      </div>

      {/* Portrait overrides */}
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>
          Retratos de Personagem
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
          Personalize o retrato exibido para cada rank. A imagem substitui o padrão somente para você.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {portraits.map((p) => {
            const override = overrides[p.rank];
            const src = override ?? p.src;
            const isUploading = uploading === p.rank;

            return (
              <div key={p.rank} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 12,
                background: "var(--bg-card)", border: "1px solid var(--border)",
              }}>
                {/* Portrait preview */}
                <div style={{
                  width: 52, height: 52, borderRadius: 10, overflow: "hidden",
                  flexShrink: 0, border: `2px solid ${p.glowColor}`,
                  boxShadow: `0 0 10px ${p.glowColor}`,
                }}>
                  <img src={src} alt={p.rank} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{p.rank}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Nível {p.minLevel}–{p.maxLevel === 999 ? "∞" : p.maxLevel} · {p.label}</div>
                  {override && (
                    <div style={{ fontSize: 10, color: "#25d99a", marginTop: 2 }}>✓ Personalizado</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => fileRefs.current[p.rank]?.click()}
                    disabled={isUploading}
                    style={{
                      background: "var(--bg-surface)", border: "1px solid var(--border)",
                      color: "var(--text-muted)", borderRadius: 8,
                      padding: "6px 12px", fontSize: 11, cursor: "pointer",
                      opacity: isUploading ? .5 : 1,
                    }}
                  >{isUploading ? "..." : "Trocar"}</button>
                  {override && (
                    <button
                      onClick={() => handleReset(p.rank)}
                      style={{
                        background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)",
                        color: "#f87171", borderRadius: 8,
                        padding: "6px 10px", fontSize: 11, cursor: "pointer",
                      }}
                    >Resetar</button>
                  )}
                </div>

                <input
                  ref={(el) => { fileRefs.current[p.rank] = el; }}
                  type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handleUpload(p.rank, e.target.files[0]); }}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
