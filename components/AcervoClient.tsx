"use client";

import { useState, useRef } from "react";
import type { Perfume } from "@/lib/db";
import { compressImage } from "@/lib/image";

type PerfumeRow = Omit<Perfume, "photo" | "pyramid_image">;

/* ===========================================================
   ACERVO — Design System "Curated Archive"
   Papel/pergaminho · Playfair Display (headlines) · Source Serif 4 (body)
   Verde-floresta primary (#2d3e33) · Bronze secondary (#7a6348)
   =========================================================== */

const S = "#f4f1ea";
const SC = "#ede8dc";
const SCL = "#f9f6ee";
const CARD = "#ffffff";
const INK = "#1a1c1a";
const INK2 = "#434943";
const OUTLINE = "#c2c9c2";
const PRIMARY = "#2d3e33";
const SECONDARY = "#7a6348";
const GOLD = "#c2a25a";

const DISPLAY = "'Playfair Display', Georgia, serif";
const BODY = "'Source Serif 4', Georgia, serif";
const LABEL = "var(--font-manrope), Manrope, system-ui, sans-serif";

const TABS = [
  { key: "owned", label: "Tenho" },
  { key: "wishlist", label: "Desejos" },
] as const;

function Stars({ rating, onRate }: { rating: number | null; onRate?: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} onClick={() => onRate?.(n)} style={{
          fontSize: onRate ? 22 : 13,
          cursor: onRate ? "pointer" : "default",
          color: (rating ?? 0) >= n ? GOLD : OUTLINE,
          letterSpacing: 1, transition: "color .1s",
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
  pyramid_image: string | null;
  pyramid_thumbnail: string | null;
}

const EMPTY: FormState = {
  name: "", brand: "", status: "owned",
  description: "", notes_top: "", notes_heart: "", notes_base: "",
  rating: null, tags: "", price: "",
  photo: null, photo_thumbnail: null,
  pyramid_image: null, pyramid_thumbnail: null,
};

export function AcervoClient({ initialPerfumes }: { initialPerfumes: PerfumeRow[] }) {
  const [perfumes, setPerfumes] = useState(initialPerfumes);
  const [tab, setTab] = useState<"owned" | "wishlist">("owned");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<PerfumeRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pyramidPreview, setPyramidPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pyramidRef = useRef<HTMLInputElement>(null);

  const filtered = perfumes
    .filter((p) => p.status === tab)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  async function openPyramidLightbox() {
    if (form.pyramid_image) { setLightbox(form.pyramid_image); return; }
    if (editing) {
      const res = await fetch(`/api/perfumes/${editing.id}`);
      const data = await res.json();
      setLightbox(data.pyramid_image ?? pyramidPreview);
    } else {
      setLightbox(pyramidPreview);
    }
  }

  async function refresh() {
    const res = await fetch("/api/perfumes");
    setPerfumes(await res.json());
  }

  function openAdd() {
    setForm(EMPTY); setPreview(null); setPyramidPreview(null); setEditing(null); setModal("add");
  }

  function openEdit(p: PerfumeRow) {
    setForm({
      name: p.name, brand: p.brand ?? "", status: p.status,
      description: p.description ?? "",
      notes_top: p.notes_top ?? "", notes_heart: p.notes_heart ?? "", notes_base: p.notes_base ?? "",
      rating: p.rating, tags: p.tags ?? "", price: p.price?.toString() ?? "",
      photo: null, photo_thumbnail: p.photo_thumbnail ?? null,
      pyramid_image: null, pyramid_thumbnail: p.pyramid_thumbnail ?? null,
    });
    setPreview(p.photo_thumbnail ?? null);
    setPyramidPreview(p.pyramid_thumbnail ?? null);
    setEditing(p); setModal("edit");
  }

  async function handleImage(file: File) {
    const full = await compressImage(file, 1600, 0.92);
    const thumb = await compressImage(file, 900, 0.90);
    setForm((f) => ({ ...f, photo: full, photo_thumbnail: thumb }));
    setPreview(thumb);
  }

  async function handlePyramidImage(file: File) {
    const full = await compressImage(file, 1600, 0.92);
    const thumb = await compressImage(file, 900, 0.90);
    setForm((f) => ({ ...f, pyramid_image: full, pyramid_thumbnail: thumb }));
    setPyramidPreview(thumb);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, price: form.price ? Number(form.price) : null };
      if (modal === "edit" && editing) {
        await fetch(`/api/perfumes/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetch("/api/perfumes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      await refresh(); setModal(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este perfume?")) return;
    setDeleting(id);
    await fetch(`/api/perfumes/${id}`, { method: "DELETE" });
    await refresh(); setDeleting(null); setModal(null);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 4,
    background: CARD, border: `1px solid ${OUTLINE}`,
    color: INK, fontSize: 14, fontFamily: BODY, outline: "none",
    transition: "border-color .15s",
  };

  const fieldInp: React.CSSProperties = {
    width: "100%", padding: "10px 0", background: "transparent",
    border: "none", borderBottom: `1px solid ${OUTLINE}`,
    color: INK, outline: "none", fontFamily: DISPLAY,
    transition: "border-color .15s",
  };

  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: SECONDARY,
    letterSpacing: ".16em", textTransform: "uppercase",
    marginBottom: 8, display: "block", fontFamily: LABEL,
  };

  return (
    <div style={{ background: S, minHeight: "100vh", padding: "48px 52px 100px", fontFamily: BODY }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ fontFamily: LABEL, fontSize: 11, fontWeight: 500, letterSpacing: ".32em", textTransform: "uppercase", color: SECONDARY, marginBottom: 8 }}>Coleção</div>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, color: PRIMARY, margin: 0, lineHeight: 1, borderLeft: `4px solid ${SECONDARY}`, paddingLeft: 20 }}>Acervo de Perfumes</h1>
          <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 15, color: INK2, margin: "8px 0 0 24px" }}>
            Uma curadoria pessoal de fragrâncias, notas olfativas e memórias aromáticas.
          </p>
          <p style={{ fontFamily: LABEL, fontSize: 12, color: `${INK2}99`, margin: "6px 0 0 24px" }}>
            {perfumes.length} fragrância{perfumes.length !== 1 ? "s" : ""} · {perfumes.filter(p => p.status === "wishlist").length} desejada{perfumes.filter(p => p.status === "wishlist").length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openAdd} style={{
          background: PRIMARY, color: "#fff", border: "none",
          borderRadius: 6, padding: "11px 22px",
          fontFamily: LABEL, fontSize: 11, fontWeight: 700,
          letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer",
        }}>+ Adicionar</button>
      </div>

      {/* Segment filter — pill */}
      <div style={{ display: "flex", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", padding: 4, borderRadius: 999, border: `1px solid ${OUTLINE}`, background: SCL, gap: 2 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "8px 20px", borderRadius: 999, cursor: "pointer", border: "none",
                fontFamily: LABEL, fontSize: 10, fontWeight: active ? 700 : 500,
                letterSpacing: ".1em", textTransform: "uppercase",
                background: active ? PRIMARY : "transparent",
                color: active ? "#fff" : INK2,
                transition: "all .15s",
              }}>{t.label}</button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, color: `${PRIMARY}33`, marginBottom: 12 }}>◦</div>
          <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 18, color: INK2 }}>Nenhuma fragrância nessa coleção ainda.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 20 }}>
          {filtered.map((p) => (
            <article key={p.id} onClick={() => openEdit(p)} style={{
              borderRadius: 12, overflow: "hidden",
              background: CARD, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(45,62,51,.10)",
              border: `1px solid rgba(45,62,51,.08)`,
              transition: "box-shadow .3s, transform .3s",
              display: "flex", flexDirection: "column",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 30px rgba(45,62,51,.16)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(45,62,51,.10)"; (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              {/* Photo */}
              <div style={{ aspectRatio: "3/4", position: "relative", overflow: "hidden", background: SC }}>
                {p.photo_thumbnail ? (
                  <img src={p.photo_thumbnail} alt={p.name} style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    transition: "transform .5s",
                    filter: p.status === "wishlist" ? "grayscale(50%)" : "brightness(1.08)",
                  }} />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    background: `linear-gradient(145deg, ${SC}, #e2d8c8)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, color: `${SECONDARY}55`,
                    filter: p.status === "wishlist" ? "grayscale(50%)" : "brightness(1.08)",
                  }}>{p.name[0]}</div>
                )}
                {/* Wishlist overlay */}
                {p.status === "wishlist" && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `${PRIMARY}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{
                      background: "rgba(255,255,255,.85)", backdropFilter: "blur(4px)",
                      fontFamily: LABEL, fontSize: 9, fontWeight: 700,
                      letterSpacing: ".2em", textTransform: "uppercase",
                      color: PRIMARY, padding: "5px 14px", borderRadius: 999,
                    }}>Desejado</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 700, color: SECONDARY, letterSpacing: ".25em", textTransform: "uppercase", marginBottom: 4 }}>{p.brand}</span>
                <h3 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: PRIMARY, margin: 0, lineHeight: 1.1, flex: 1 }}>{p.name}</h3>
                {p.rating != null && (
                  <div style={{ marginTop: 10 }}><Stars rating={p.rating} /></div>
                )}
                {!p.brand && !p.rating && (
                  <div style={{ marginTop: 8 }} />
                )}
              </div>
            </article>
          ))}

          {/* "+ Adicionar" card */}
          <button onClick={openAdd} style={{
            aspectRatio: "3/4", borderRadius: 12, border: `2px dashed ${OUTLINE}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            background: "none", cursor: "pointer",
            transition: "border-color .2s, background .2s",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = SECONDARY; (e.currentTarget as HTMLElement).style.background = `${SC}88`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = OUTLINE; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 999,
              border: `1px solid ${OUTLINE}`, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color .2s",
            }}>
              <span style={{ fontSize: 20, color: INK2 }}>+</span>
            </div>
            <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: INK2 }}>Adicionar perfume</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(45,62,51,.45)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 24px",
        }}>
          <div style={{
            background: SCL, borderRadius: 12,
            width: "100%", maxWidth: 896, maxHeight: "92vh", overflow: "hidden",
            border: `1px solid rgba(194,201,194,.3)`,
            boxShadow: "0 32px 64px -12px rgba(45,62,51,.4)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "24px 32px", borderBottom: `1px solid ${OUTLINE}`,
              background: SC, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <div>
                <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: SECONDARY, display: "block", marginBottom: 6 }}>Novo registro</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 700, fontStyle: "italic", color: PRIMARY }}>{modal === "add" ? "Adicionar fragrância" : "Editar fragrância"}</span>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: INK2, fontSize: 20, padding: 6 }}>✕</button>
            </div>

            {/* Modal body — 2 columns */}
            <div style={{ flex: 1, overflowY: "auto", background: S }}>
              <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 40, padding: "32px" }}>

                {/* LEFT: foto + avaliação + disponibilidade */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* Photo upload */}
                  <label style={{ cursor: "pointer", display: "block" }}>
                    <div onClick={() => fileRef.current?.click()} style={{
                      aspectRatio: "4/5", borderRadius: 8, overflow: "hidden",
                      border: `2px dashed ${OUTLINE}`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                      background: CARD, position: "relative", transition: "border-color .2s",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = PRIMARY; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = OUTLINE; }}
                    >
                      {preview ? (
                        <img src={preview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <>
                          <span style={{ fontSize: 40, color: OUTLINE }}>📷</span>
                          <span style={{ fontFamily: LABEL, fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: INK2 }}>Registrar imagem</span>
                        </>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files?.[0]) handleImage(e.target.files[0]); }} />
                  </label>

                  {/* Ficha lateral */}
                  <div style={{ background: CARD, border: `1px solid ${OUTLINE}`, borderRadius: 8, padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Avaliação */}
                    <div>
                      <span style={lbl}>Avaliação pessoal</span>
                      <Stars rating={form.rating} onRate={(n) => setForm((f) => ({ ...f, rating: f.rating === n ? null : n }))} />
                    </div>

                    {/* Disponibilidade */}
                    <div style={{ borderTop: `1px solid ${OUTLINE}`, paddingTop: 20 }}>
                      <span style={lbl}>Disponibilidade</span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[{ value: "owned", label: "Na coleção" }, { value: "wishlist", label: "Desejo" }].map((opt) => (
                          <button key={opt.value} type="button" onClick={() => setForm((f) => ({ ...f, status: opt.value as "owned" | "wishlist" }))} style={{
                            padding: "10px 8px", borderRadius: 6, cursor: "pointer",
                            fontFamily: LABEL, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
                            background: form.status === opt.value ? PRIMARY : "transparent",
                            color: form.status === opt.value ? "#fff" : INK2,
                            border: form.status === opt.value ? "none" : `1px solid ${OUTLINE}`,
                            transition: "all .15s",
                          }}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: nome + maison + pirâmide + tags + preço + impressões */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* Nome */}
                  <div>
                    <span style={lbl}>Nome da fragrância *</span>
                    <input type="text" value={form.name} placeholder="Ex: Grand Soir"
                      style={{ ...fieldInp, fontSize: 24, fontStyle: "italic" }}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderBottomColor = PRIMARY; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderBottomColor = OUTLINE; }}
                    />
                  </div>

                  {/* Maison */}
                  <div>
                    <span style={lbl}>Maison / perfumista</span>
                    <input type="text" value={form.brand} placeholder="Ex: Maison Francis Kurkdjian"
                      style={{ ...fieldInp, fontSize: 17, fontFamily: BODY }}
                      onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderBottomColor = PRIMARY; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderBottomColor = OUTLINE; }}
                    />
                  </div>

                  {/* Pirâmide olfativa */}
                  <div>
                    <span style={lbl}>Pirâmide olfativa</span>
                    <div
                      onClick={() => { if (!pyramidPreview) pyramidRef.current?.click(); }}
                      style={{
                        position: "relative", borderRadius: 8, overflow: "hidden",
                        border: `2px dashed ${pyramidPreview ? "transparent" : OUTLINE}`,
                        background: pyramidPreview ? "transparent" : CARD,
                        height: 160,
                        cursor: pyramidPreview ? "default" : "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "border-color .2s",
                      }}
                      onMouseEnter={(e) => { if (!pyramidPreview) (e.currentTarget as HTMLElement).style.borderColor = PRIMARY; }}
                      onMouseLeave={(e) => { if (!pyramidPreview) (e.currentTarget as HTMLElement).style.borderColor = OUTLINE; }}
                    >
                      {pyramidPreview ? (
                        <>
                          <img
                            src={pyramidPreview} alt="Pirâmide"
                            onClick={(e) => { e.stopPropagation(); openPyramidLightbox(); }}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
                          />
                          {/* Trocar botão sobreposto */}
                          <button
                            onClick={(e) => { e.stopPropagation(); pyramidRef.current?.click(); }}
                            style={{
                              position: "absolute", top: 8, right: 8, zIndex: 2,
                              background: "rgba(255,255,255,.85)", backdropFilter: "blur(4px)",
                              border: "none", borderRadius: 6, padding: "4px 10px",
                              fontFamily: LABEL, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
                              color: INK, cursor: "pointer",
                            }}
                          >Trocar</button>
                        </>
                      ) : (
                        <>
                          <svg width="26" height="24" viewBox="0 0 26 24" fill="none">
                            <path d="M13 1L25 23H1L13 1Z" stroke="#7a6348" strokeWidth="1.5" strokeLinejoin="round"/>
                            <line x1="13" y1="8" x2="13" y2="15" stroke="#7a6348" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="13" cy="19" r="1.2" fill="#7a6348"/>
                          </svg>
                          <span style={{ fontFamily: LABEL, fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: INK2 }}>Registrar pirâmide</span>
                        </>
                      )}
                    </div>
                    <input ref={pyramidRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files?.[0]) handlePyramidImage(e.target.files[0]); }} />
                    {pyramidPreview && (
                      <button onClick={() => { setPyramidPreview(null); setForm((f) => ({ ...f, pyramid_image: null, pyramid_thumbnail: null })); }}
                        style={{ background: "none", border: "none", color: INK2, fontSize: 12, cursor: "pointer", marginTop: 6, fontFamily: LABEL, textDecoration: "underline", padding: 0 }}>
                        Remover imagem
                      </button>
                    )}
                  </div>

                  {/* Estilo / Preço */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <span style={lbl}>Estilo & ocasião</span>
                      <input type="text" value={form.tags} placeholder="âmbar, formal, inverno" style={inp}
                        onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                    </div>
                    <div>
                      <span style={lbl}>Investimento (R$)</span>
                      <input type="number" min="0" step="0.01" value={form.price} placeholder="0,00" style={inp}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                    </div>
                  </div>

                  {/* Impressões */}
                  <div>
                    <span style={lbl}>Impressões</span>
                    <textarea rows={4} value={form.description}
                      placeholder="Projeção, longevidade e as memórias que essa fragrância evoca..."
                      style={{ ...inp, resize: "vertical", minHeight: 100, lineHeight: 1.6 }}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>

                  {preview && (
                    <button onClick={() => { setPreview(null); setForm((f) => ({ ...f, photo: null, photo_thumbnail: null })); }}
                      style={{ background: "none", border: "none", color: INK2, fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: LABEL, textDecoration: "underline" }}>
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: "16px 32px", borderTop: `1px solid ${OUTLINE}`, background: SC, display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
              {modal === "edit" && editing && (
                <button onClick={() => handleDelete(editing.id)} disabled={deleting === editing.id} style={{
                  background: "rgba(190,50,40,.1)", border: "1px solid rgba(190,50,40,.3)",
                  color: "#be3228", borderRadius: 6, padding: "11px 18px",
                  fontFamily: LABEL, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
                }}>Excluir</button>
              )}
              <button onClick={() => setModal(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: LABEL, fontSize: 11, color: INK2, letterSpacing: ".12em", textTransform: "uppercase", padding: "11px 18px",
              }}>Descartar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
                background: PRIMARY, color: "#fff", border: "none", borderRadius: 6,
                padding: "11px 28px", fontFamily: LABEL, fontSize: 11, fontWeight: 700,
                letterSpacing: ".12em", textTransform: "uppercase",
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
              }}>{saving ? "Salvando..." : "Finalizar registro"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,.92)", backdropFilter: "blur(8px)",
            overflowY: "auto", cursor: "zoom-out",
            padding: "32px 24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", minHeight: "100%" }}>
            <img
              src={lightbox} alt="Pirâmide olfativa"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "block",
                width: "min(900px, calc(100vw - 48px))",
                height: "auto",
                borderRadius: 8,
                boxShadow: "0 24px 64px rgba(0,0,0,.6)",
                alignSelf: "flex-start",
                cursor: "default",
              }}
            />
          </div>
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "rgba(255,255,255,.15)", backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,.2)", borderRadius: "50%",
              width: 40, height: 40, color: "#fff", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}
