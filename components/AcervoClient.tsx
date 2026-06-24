"use client";

import { useState, useRef } from "react";
import type { Perfume } from "@/lib/db";
import { compressImage } from "@/lib/image";

type PerfumeRow = Omit<Perfume, "photo">;

const STATUS_LABEL: Record<string, string> = { owned: "Tenho", wishlist: "Wishlist" };
const STATUS_COLOR: Record<string, string> = { owned: "#25d99a", wishlist: "#ffce47" };

const TABS = [
  { key: "all", label: "Todos" },
  { key: "owned", label: "Tenho" },
  { key: "wishlist", label: "Wishlist" },
] as const;

function Stars({ rating, onRate }: { rating: number | null; onRate?: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} onClick={() => onRate?.(n)} style={{
          fontSize: 14, cursor: onRate ? "pointer" : "default",
          color: (rating ?? 0) >= n ? "#ffce47" : "var(--border)",
        }}>★</span>
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
    width: "100%", padding: "8px 10px", borderRadius: 8,
    background: "var(--bg-card)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontSize: 13, outline: "none",
  };

  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
    letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4, display: "block",
  };

  return (
    <div style={{ padding: "24px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>🌸 Acervo</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{perfumes.length} perfume{perfumes.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openAdd} style={{
          background: "var(--accent-violet)", color: "#fff",
          border: "none", borderRadius: 10, padding: "8px 16px",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>+ Adicionar</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: "1px solid var(--border)", cursor: "pointer",
            background: tab === t.key ? "var(--accent-violet)" : "var(--bg-card)",
            color: tab === t.key ? "#fff" : "var(--text-muted)",
            transition: "all .15s",
          }}>{t.label} {t.key !== "all" && <span style={{ opacity: .7 }}>({perfumes.filter(p => p.status === t.key).length})</span>}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌸</div>
          <p style={{ fontSize: 14 }}>Nenhum perfume aqui ainda.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 14,
        }}>
          {filtered.map((p) => (
            <div key={p.id} onClick={() => openEdit(p)} style={{
              borderRadius: 12, overflow: "hidden",
              background: "var(--bg-card)", border: "1px solid var(--border)",
              cursor: "pointer", transition: "transform .15s, box-shadow .15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
            >
              {/* Photo */}
              <div style={{ height: 160, position: "relative", overflow: "hidden" }}>
                {p.photo_thumbnail ? (
                  <img src={p.photo_thumbnail} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    background: "linear-gradient(135deg, #1a1a30, #2a1040)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 48, color: "rgba(255,255,255,.12)",
                  }}>🌸</div>
                )}
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  background: STATUS_COLOR[p.status], color: "#000",
                  fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6,
                }}>{STATUS_LABEL[p.status]}</span>
              </div>

              <div style={{ padding: "10px 10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 2 }}>{p.name}</div>
                {p.brand && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{p.brand}</div>}
                {p.rating && <Stars rating={p.rating} />}
                {p.tags && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {p.tags.split(",").slice(0, 2).map((t) => (
                      <span key={t} style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                        background: "rgba(139,92,246,.2)", color: "#a78bfa",
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
          background: "rgba(0,0,0,.7)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--bg-surface)", borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 560,
            maxHeight: "90vh", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                {modal === "add" ? "Novo Perfume" : "Editar Perfume"}
              </span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Photo upload */}
              <div>
                <span style={lbl}>Foto</span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div onClick={() => fileRef.current?.click()} style={{
                    width: 80, height: 80, borderRadius: 12, overflow: "hidden",
                    border: "2px dashed var(--border)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--bg-card)", flexShrink: 0,
                  }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 28 }}>🌸</span>
                    )}
                  </div>
                  <div>
                    <button onClick={() => fileRef.current?.click()} style={{
                      background: "var(--bg-card)", border: "1px solid var(--border)",
                      color: "var(--text-muted)", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer",
                    }}>Escolher imagem</button>
                    {imagePreview && (
                      <button onClick={() => { setImagePreview(null); setForm((f) => ({ ...f, photo: null, photo_thumbnail: null })); }}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", marginLeft: 8 }}>
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handleImage(e.target.files[0]); }} />
              </div>

              <div>
                <span style={lbl}>Nome *</span>
                <input style={inp} value={form.name} placeholder="Nome do perfume"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <span style={lbl}>Marca</span>
                  <input style={inp} value={form.brand} placeholder="—"
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                </div>
                <div>
                  <span style={lbl}>Status</span>
                  <select style={inp} value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}>
                    <option value="owned">Tenho</option>
                    <option value="wishlist">Wishlist</option>
                  </select>
                </div>
              </div>

              <div>
                <span style={lbl}>Avaliação</span>
                <Stars rating={form.rating} onRate={(n) => setForm((f) => ({ ...f, rating: f.rating === n ? null : n }))} />
              </div>

              <div>
                <span style={lbl}>Notas de topo</span>
                <input style={inp} value={form.notes_top} placeholder="Bergamota, limão..."
                  onChange={(e) => setForm((f) => ({ ...f, notes_top: e.target.value }))} />
              </div>
              <div>
                <span style={lbl}>Notas de coração</span>
                <input style={inp} value={form.notes_heart} placeholder="Jasmim, rosa..."
                  onChange={(e) => setForm((f) => ({ ...f, notes_heart: e.target.value }))} />
              </div>
              <div>
                <span style={lbl}>Notas de fundo</span>
                <input style={inp} value={form.notes_base} placeholder="Amadeirado, musgo..."
                  onChange={(e) => setForm((f) => ({ ...f, notes_base: e.target.value }))} />
              </div>

              <div>
                <span style={lbl}>Tags</span>
                <input style={inp} value={form.tags} placeholder="fresco, noturno, intenso"
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

            <div style={{
              padding: "12px 20px", borderTop: "1px solid var(--border)",
              display: "flex", gap: 10, flexShrink: 0,
            }}>
              {modal === "edit" && editing && (
                <button onClick={() => handleDelete(editing.id)} disabled={deleting === editing.id} style={{
                  background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)",
                  color: "#ef4444", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer",
                }}>Excluir</button>
              )}
              <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
                flex: 1, background: "var(--accent-violet)", color: "#fff",
                border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
              }}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
