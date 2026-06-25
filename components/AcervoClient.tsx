"use client";

import { useState, useRef } from "react";
import type { Perfume } from "@/lib/db";
import { compressImage } from "@/lib/image";

type PerfumeRow = Omit<Perfume, "photo">;

/* ===========================================================
   ACERVO — identidade "Atelier"
   Ouro sobre carvão quente · títulos em Cormorant Garamond.
   =========================================================== */

const GOLD = "#c7a05c";
const GOLD_BRIGHT = "#d8b577";
const CARD_BG = "#1c160d";
const CARD_BORDER = "#2a2114";
const TXT = "#f3e9d6";
const TXT_MUTED = "#8a7f6b";
const SERIF = "'Cormorant Garamond', Georgia, serif";

const STATUS_LABEL: Record<string, string> = { owned: "Tenho", wishlist: "Desejo" };

const TABS = [
  { key: "all", label: "Todos" },
  { key: "owned", label: "Tenho" },
  { key: "wishlist", label: "Desejos" },
] as const;

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Stars({ rating, onRate }: { rating: number | null; onRate?: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onRate?.(n)}
          style={{
            fontSize: onRate ? 20 : 13,
            letterSpacing: 1,
            cursor: onRate ? "pointer" : "default",
            color: (rating ?? 0) >= n ? GOLD_BRIGHT : "#3a3325",
          }}
        >★</span>
      ))}
    </div>
  );
}

interface FormState {
  name: string;
  brand: string;
  status: "owned" | "wishlist";
  description: string;
  notes_top: string;
  notes_heart: string;
  notes_base: string;
  rating: number | null;
  tags: string;
  price: string;
  photo: string | null;
  photo_thumbnail: string | null;
}

const EMPTY_FORM: FormState = {
  name: "", brand: "", status: "owned",
  description: "", notes_top: "", notes_heart: "", notes_base: "",
  rating: null, tags: "", price: "",
  photo: null, photo_thumbnail: null,
};

export function AcervoClient({ initialPerfumes }: { initialPerfumes: PerfumeRow[] }) {
  const [perfumes, setPerfumes] = useState(initialPerfumes);
  const [tab, setTab] = useState<"all" | "owned" | "wishlist">("all");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<PerfumeRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = tab === "all" ? perfumes : perfumes.filter((p) => p.status === tab);
  const ownedCount = perfumes.filter((p) => p.status === "owned").length;
  const wishCount = perfumes.filter((p) => p.status === "wishlist").length;

  async function refresh() {
    const res = await fetch("/api/perfumes");
    setPerfumes(await res.json());
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setEditing(null);
    setModal("add");
  }

  function openEdit(p: PerfumeRow) {
    setForm({
      name: p.name,
      brand: p.brand ?? "",
      status: p.status,
      description: p.description ?? "",
      notes_top: p.notes_top ?? "",
      notes_heart: p.notes_heart ?? "",
      notes_base: p.notes_base ?? "",
      rating: p.rating,
      tags: p.tags ?? "",
      price: p.price?.toString() ?? "",
      photo: null,
      photo_thumbnail: p.photo_thumbnail ?? null,
    });
    setImagePreview(p.photo_thumbnail ?? null);
    setEditing(p);
    setModal("edit");
  }

  async function handleImage(file: File) {
    const full = await compressImage(file, 800, 0.82);
    const thumb = await compressImage(file, 120, 0.65);
    setForm((f) => ({ ...f, photo: full, photo_thumbnail: thumb }));
    setImagePreview(thumb);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, price: form.price ? Number(form.price) : null };
      if (modal === "edit" && editing) {
        await fetch(`/api/perfumes/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/perfumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      await refresh();
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este perfume?")) return;
    setDeleting(id);
    await fetch(`/api/perfumes/${id}`, { method: "DELETE" });
    await refresh();
    setDeleting(null);
    setModal(null);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 9,
    background: "#1a140c", border: `1px solid ${CARD_BORDER}`,
    color: TXT, fontSize: 14, outline: "none",
  };

  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: TXT_MUTED,
    letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 7, display: "block",
  };

  return (
    <div style={{ padding: "30px 28px 100px", maxWidth: 900, margin: "0 auto", fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".32em", textTransform: "uppercase", color: GOLD, marginBottom: 8 }}>Coleção</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 38, lineHeight: 0.9, color: TXT, margin: 0 }}>Acervo</h1>
          <p style={{ fontSize: 12, color: "#7d7361", margin: "8px 0 0", letterSpacing: ".04em" }}>
            {perfumes.length} fragrância{perfumes.length !== 1 ? "s" : ""}{wishCount > 0 ? ` · ${wishCount} desejada${wishCount !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 7,
          background: `linear-gradient(180deg, ${GOLD_BRIGHT}, #bd9650)`, color: "#1a1305",
          border: "none", borderRadius: 999, padding: "11px 18px",
          fontSize: 12, fontWeight: 700, letterSpacing: ".04em", cursor: "pointer",
          boxShadow: "0 8px 20px -8px rgba(199,160,92,.6)",
        }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Adicionar
        </button>
      </div>

      {/* Tabs — editorial underline */}
      <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${CARD_BORDER}`, marginBottom: 24 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = t.key === "owned" ? ownedCount : t.key === "wishlist" ? wishCount : 0;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "0 0 12px", background: "none", border: "none", marginBottom: -1,
              fontSize: 13, fontWeight: active ? 600 : 500,
              color: active ? TXT : "#7d7361",
              borderBottom: `2px solid ${active ? GOLD : "transparent"}`,
              cursor: "pointer",
            }}>
              {t.label}{t.key !== "all" && <span style={{ color: "#5d5648", marginLeft: 6 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 20px", color: TXT_MUTED }}>
          <div style={{ fontFamily: SERIF, fontSize: 44, color: "rgba(199,160,92,.35)", marginBottom: 6 }}>◦</div>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: "#9a8f7d" }}>Nenhuma fragrância por aqui ainda.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {filtered.map((p) => (
            <div key={p.id} onClick={() => openEdit(p)} style={{
              borderRadius: 14, overflow: "hidden",
              background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
              cursor: "pointer", transition: "transform .15s, box-shadow .15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 28px -12px rgba(0,0,0,.7)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
            >
              {/* Photo / monogram */}
              <div style={{ height: 158, position: "relative", overflow: "hidden" }}>
                {p.photo_thumbnail ? (
                  <img src={p.photo_thumbnail} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    background: "linear-gradient(155deg, #4a3618, #1f160b)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: SERIF, fontSize: 40, fontWeight: 600, color: "rgba(216,181,119,.4)",
                  }}>{monogram(p.name)}</div>
                )}
                <span style={{
                  position: "absolute", top: 10, right: 10,
                  background: p.status === "owned" ? "rgba(216,181,119,.92)" : "rgba(20,16,9,.7)",
                  border: p.status === "owned" ? "none" : `1px solid rgba(216,181,119,.5)`,
                  color: p.status === "owned" ? "#1a1305" : GOLD_BRIGHT,
                  fontSize: 9, fontWeight: 800, letterSpacing: ".06em",
                  padding: "3px 9px", borderRadius: 999, textTransform: "uppercase",
                }}>{STATUS_LABEL[p.status]}</span>
              </div>

              <div style={{ padding: "13px 14px 15px" }}>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 19, color: TXT, lineHeight: 1.1 }}>{p.name}</div>
                {p.brand && <div style={{ fontSize: 11, color: TXT_MUTED, marginTop: 3, letterSpacing: ".03em" }}>{p.brand}</div>}
                {p.rating != null && <div style={{ marginTop: 8 }}><Stars rating={p.rating} /></div>}
                {p.tags && (
                  <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {p.tags.split(",").slice(0, 2).map((t) => (
                      <span key={t} style={{
                        fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                        background: "rgba(199,160,92,.12)", border: "1px solid rgba(199,160,92,.25)", color: GOLD,
                      }}>{t.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,.75)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: "#100c06", borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden",
            border: `1px solid ${CARD_BORDER}`, borderBottom: "none",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: `1px solid ${CARD_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
              background: "radial-gradient(120% 100% at 0% 0%, rgba(199,160,92,.1), transparent 60%)",
            }}>
              <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 24, color: TXT }}>
                {modal === "add" ? "Novo Perfume" : "Editar Perfume"}
              </span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "#7d7361", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Photo */}
              <div>
                <span style={lbl}>Foto</span>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div onClick={() => fileRef.current?.click()} style={{
                    width: 80, height: 80, borderRadius: 12, overflow: "hidden",
                    border: "1.5px dashed #3a2f1c", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#1a140c", flexShrink: 0,
                    fontFamily: SERIF, fontSize: 26, color: "rgba(216,181,119,.4)",
                  }}>
                    {imagePreview ? <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "+"}
                  </div>
                  <div>
                    <button onClick={() => fileRef.current?.click()} style={{
                      background: "none", border: "1px solid rgba(199,160,92,.3)",
                      color: GOLD, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Escolher imagem</button>
                    {imagePreview && (
                      <button onClick={() => { setImagePreview(null); setForm((f) => ({ ...f, photo: null, photo_thumbnail: null })); }}
                        style={{ background: "none", border: "none", color: TXT_MUTED, fontSize: 11, cursor: "pointer", marginLeft: 8 }}>Remover</button>
                    )}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handleImage(e.target.files[0]); }} />
              </div>

              <div>
                <span style={lbl}>Nome *</span>
                <input style={{ ...inp, fontFamily: SERIF, fontSize: 17 }} value={form.name} placeholder="Nome do perfume"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={lbl}>Marca</span>
                  <input style={inp} value={form.brand} placeholder="—"
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                </div>
                <div>
                  <span style={lbl}>Status</span>
                  <select style={{ ...inp, borderColor: "rgba(199,160,92,.4)", color: GOLD_BRIGHT, fontWeight: 600 }} value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}>
                    <option value="owned">Tenho</option>
                    <option value="wishlist">Desejo</option>
                  </select>
                </div>
              </div>

              <div>
                <span style={lbl}>Avaliação</span>
                <Stars rating={form.rating} onRate={(n) => setForm((f) => ({ ...f, rating: f.rating === n ? null : n }))} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <span style={lbl}>Topo</span>
                  <input style={inp} value={form.notes_top} placeholder="bergamota"
                    onChange={(e) => setForm((f) => ({ ...f, notes_top: e.target.value }))} />
                </div>
                <div>
                  <span style={lbl}>Coração</span>
                  <input style={inp} value={form.notes_heart} placeholder="jasmim"
                    onChange={(e) => setForm((f) => ({ ...f, notes_heart: e.target.value }))} />
                </div>
                <div>
                  <span style={lbl}>Fundo</span>
                  <input style={inp} value={form.notes_base} placeholder="âmbar"
                    onChange={(e) => setForm((f) => ({ ...f, notes_base: e.target.value }))} />
                </div>
              </div>

              <div>
                <span style={lbl}>Tags</span>
                <input style={inp} value={form.tags} placeholder="fresco, noturno, intenso"
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={lbl}>Preço (R$)</span>
                  <input style={inp} type="number" min="0" step="0.01" value={form.price} placeholder="—"
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
              </div>

              <div>
                <span style={lbl}>Descrição / impressão</span>
                <textarea style={{ ...inp, resize: "vertical", minHeight: 72 }} value={form.description}
                  placeholder="O que você achou, ocasiões, sensações..."
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${CARD_BORDER}`, display: "flex", gap: 10, flexShrink: 0 }}>
              {modal === "edit" && editing && (
                <button onClick={() => handleDelete(editing.id)} disabled={deleting === editing.id} style={{
                  background: "rgba(240,85,106,.12)", border: "1px solid rgba(240,85,106,.3)",
                  color: "#f0556a", borderRadius: 9, padding: "11px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>Excluir</button>
              )}
              <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
                flex: 1, background: `linear-gradient(180deg, ${GOLD_BRIGHT}, #bd9650)`, color: "#1a1305",
                border: "none", borderRadius: 9, padding: "11px", fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                boxShadow: "0 8px 20px -8px rgba(199,160,92,.6)",
              }}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
