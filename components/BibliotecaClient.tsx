"use client";

import { useState, useRef } from "react";
import type { Book } from "@/lib/db";
import { compressImage } from "@/lib/image";

type BookRow = Omit<Book, "cover_image">;

/* ===========================================================
   BIBLIOTECA — Dark System theme
   =========================================================== */

// Paleta escura (mesmas variáveis, novos valores)
const S    = "#0a0612";        // page background
const SC   = "#120a1f";        // surface raised (modal header/footer)
const SCL  = "#0a0612";        // modal body bg
const SCH  = "#1a0f2e";        // placeholder cover bg
const CARD = "#140d22";        // card / field bg
const INK  = "#e0d0ff";        // primary text
const INK2 = "#8a6db3";        // secondary text
const OUTLINE  = "#2a1f3d";    // border
const OUTLINE2 = "#3d2a5f";    // brighter border (dashed add-card)
const PRIMARY  = "#b388ff";    // accent violet
const SECONDARY = "#8a6db3";   // label color
const GOLD     = "#ffb84d";    // estrelas
const STAR_EMPTY = "#3d3450";  // estrelas vazias
const READ_BAR   = "#378add";  // barra de progresso (Estudo / +INT)

const DISPLAY = "'Playfair Display', Georgia, serif";
const BODY    = "'Source Serif 4', Georgia, serif";
const LABEL   = "var(--font-space-grotesk), var(--font-manrope), sans-serif";

const TABS = [
  { key: "reading", label: "Lendo" },
  { key: "want",    label: "Quero ler" },
  { key: "read",    label: "Concluídos" },
] as const;

function Stars({ rating, onRate }: { rating: number | null; onRate?: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} onClick={() => onRate?.(n)} style={{
          fontSize: onRate ? 22 : 13,
          cursor: onRate ? "pointer" : "default",
          color: (rating ?? 0) >= n ? GOLD : STAR_EMPTY,
          letterSpacing: 1,
          transition: "color .1s",
        }}>★</span>
      ))}
    </div>
  );
}

interface FormState {
  title: string;
  author: string;
  status: "want" | "reading" | "read";
  total_pages: string;
  current_page: string;
  rating: number | null;
  description: string;
  summary: string;
  cover_image: string | null;
  cover_thumbnail: string | null;
}

const EMPTY: FormState = {
  title: "", author: "", status: "want",
  total_pages: "", current_page: "",
  rating: null, description: "", summary: "",
  cover_image: null, cover_thumbnail: null,
};

const STATUS_OPTS = [
  { value: "want",    label: "Quero ler" },
  { value: "reading", label: "Lendo" },
  { value: "read",    label: "Lido" },
] as const;

export function BibliotecaClient({ initialBooks }: { initialBooks: BookRow[] }) {
  const [books, setBooks] = useState(initialBooks);
  const [tab, setTab] = useState<"reading" | "want" | "read">("reading");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = books.filter((b) => b.status === tab);

  const progressPct = form.total_pages && Number(form.total_pages) > 0
    ? Math.min(100, Math.round(Number(form.current_page || 0) / Number(form.total_pages) * 100))
    : 0;

  async function refresh() {
    const res = await fetch("/api/books");
    setBooks(await res.json());
  }

  function openAdd() {
    setForm(EMPTY); setPreview(null); setEditing(null); setModal("add");
  }

  function openEdit(b: BookRow) {
    setForm({
      title: b.title, author: b.author ?? "", status: b.status,
      total_pages: b.total_pages?.toString() ?? "",
      current_page: b.current_page?.toString() ?? "",
      rating: b.rating, description: b.description ?? "",
      summary: b.summary ?? "", cover_image: null,
      cover_thumbnail: b.cover_thumbnail ?? null,
    });
    setPreview(b.cover_thumbnail ?? null);
    setEditing(b); setModal("edit");
  }

  async function handleImage(file: File) {
    const full  = await compressImage(file, 1600, 0.92);
    const thumb = await compressImage(file, 900,  0.90);
    setForm((f) => ({ ...f, cover_image: full, cover_thumbnail: thumb }));
    setPreview(thumb);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        total_pages:  form.total_pages  ? Number(form.total_pages)  : null,
        current_page: form.current_page ? Number(form.current_page) : 0,
      };
      if (modal === "edit" && editing) {
        await fetch(`/api/books/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      await refresh(); setModal(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este livro?")) return;
    setDeleting(id);
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    await refresh(); setDeleting(null); setModal(null);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 4,
    background: SC, border: `1px solid ${OUTLINE}`,
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
          <div style={{ fontFamily: LABEL, fontSize: 11, fontWeight: 500, letterSpacing: ".32em", textTransform: "uppercase", color: SECONDARY, marginBottom: 8 }}>
            Estante
          </div>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, color: INK, margin: 0, lineHeight: 1, borderLeft: `4px solid ${PRIMARY}`, paddingLeft: 20 }}>
            Biblioteca
          </h1>
          <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 15, color: INK2, margin: "8px 0 0 24px" }}>
            Registro físico e digital de literatura, ensaios e artes visuais.
          </p>
          <p style={{ fontFamily: LABEL, fontSize: 12, color: INK2, opacity: .55, margin: "6px 0 0 24px" }}>
            {books.length} obra{books.length !== 1 ? "s" : ""} · {books.filter(b => b.status === "reading").length} em leitura
          </p>
        </div>
        <button onClick={openAdd} style={{
          background: "linear-gradient(90deg, #6d28d9, #8b5cf6)",
          color: "#e0d0ff", border: "none",
          borderRadius: 6, padding: "11px 22px",
          fontFamily: LABEL, fontSize: 11, fontWeight: 700,
          letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer",
          boxShadow: "0 0 12px rgba(109,40,217,0.5)",
          transition: "opacity .15s",
        }}>+ Catalogar</button>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, paddingBottom: 20, borderBottom: `1px solid ${OUTLINE}` }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const count  = books.filter(b => b.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "7px 20px", borderRadius: 999, cursor: "pointer",
              fontFamily: LABEL, fontSize: 11, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              background: active ? "rgba(179,136,255,0.12)" : "transparent",
              color:      active ? PRIMARY : INK2,
              border:     active ? `1px solid rgba(179,136,255,0.3)` : `1px solid ${OUTLINE}`,
              transition: "all .15s",
            }}>
              {t.label}<span style={{ marginLeft: 6, fontWeight: 400, opacity: .6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid de livros */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, color: `${PRIMARY}33`, marginBottom: 12 }}>◦</div>
          <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 18, color: INK2 }}>Nenhum livro nessa prateleira ainda.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 24 }}>
          {filtered.map((b) => {
            const pct = b.total_pages ? Math.min(100, Math.round((b.current_page / b.total_pages) * 100)) : 0;
            return (
              <article key={b.id} onClick={() => openEdit(b)} style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}>
                {/* Capa */}
                <div style={{
                  aspectRatio: "2/3", borderRadius: 6, overflow: "hidden",
                  marginBottom: 12, background: SCH,
                  boxShadow: "0 4px 16px rgba(0,0,0,.5), 0 0 14px rgba(179,136,255,0.1)",
                  transition: "box-shadow .3s, transform .3s",
                  position: "relative",
                }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 28px rgba(0,0,0,.65), 0 0 22px rgba(179,136,255,0.2)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,.5), 0 0 14px rgba(179,136,255,0.1)";
                    (e.currentTarget as HTMLElement).style.transform = "";
                  }}
                >
                  {b.cover_thumbnail ? (
                    <img src={b.cover_thumbnail} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      background: `linear-gradient(145deg, ${SC}, ${SCH})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: DISPLAY, fontSize: 52, color: `${PRIMARY}44`, fontWeight: 700,
                    }}>{b.title[0]}</div>
                  )}
                </div>

                {/* Info */}
                <h3 style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, color: INK, margin: 0, lineHeight: 1.25 }}>{b.title}</h3>
                {b.author && <p style={{ fontFamily: BODY, fontSize: 12, fontStyle: "italic", color: INK2, margin: "4px 0 0" }}>{b.author}</p>}

                {b.status === "reading" && (
                  <div style={{ marginTop: 10, paddingTop: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 700, color: READ_BAR }}>{pct}%</span>
                      <span style={{ fontFamily: LABEL, fontSize: 9, fontWeight: 500, color: INK2, textTransform: "uppercase", letterSpacing: ".08em", opacity: .7 }}>Lendo</span>
                    </div>
                    <div style={{ height: 3, background: `${READ_BAR}22`, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: READ_BAR, borderRadius: 999 }} />
                    </div>
                  </div>
                )}
                {b.status === "read" && (
                  <div style={{ marginTop: 8 }}>
                    {b.rating ? <Stars rating={b.rating} /> : (
                      <span style={{ fontFamily: LABEL, fontSize: 9, fontWeight: 700, color: PRIMARY, letterSpacing: ".12em", border: `1px solid ${OUTLINE2}`, padding: "2px 8px", display: "inline-block", textTransform: "uppercase" }}>Catalogado</span>
                    )}
                  </div>
                )}
                {b.status === "want" && (
                  <span style={{ fontFamily: LABEL, fontSize: 9, fontWeight: 700, color: INK2, opacity: .55, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 8, display: "block" }}>Pendente</span>
                )}
              </article>
            );
          })}

          {/* Card "+ Catalogar" */}
          <button onClick={openAdd} style={{ display: "flex", flexDirection: "column", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
            <div style={{
              aspectRatio: "2/3", borderRadius: 6, width: "100%",
              border: `2px dashed ${OUTLINE2}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              background: "transparent", transition: "background .2s, border-color .2s",
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${PRIMARY}0a`;
                (e.currentTarget as HTMLElement).style.borderColor = PRIMARY;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = OUTLINE2;
              }}
            >
              <span style={{ fontSize: 32, color: `${PRIMARY}55` }}>＋</span>
              <span style={{ fontFamily: LABEL, fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: `${PRIMARY}77` }}>Catalogar livro</span>
            </div>
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 24px",
        }}>
          <div style={{
            background: CARD, borderRadius: 12,
            width: "100%", maxWidth: 896, maxHeight: "92vh", overflow: "hidden",
            border: `1px solid ${OUTLINE2}`,
            boxShadow: "0 32px 64px rgba(0,0,0,.8), 0 0 40px rgba(139,92,246,0.12)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "24px 32px", borderBottom: `1px solid ${OUTLINE}`,
              background: SC, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <div>
                <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: SECONDARY, display: "block", marginBottom: 6 }}>
                  {modal === "add" ? "Novo registro" : "Editar registro"}
                </span>
                <span style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, color: INK }}>
                  {modal === "add" ? "Adicionar livro" : "Editar livro"}
                </span>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: INK2, fontSize: 20, padding: 6 }}>✕</button>
            </div>

            {/* Modal body — 2 colunas */}
            <div style={{ flex: 1, overflowY: "auto", background: SCL }}>
              <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 40, padding: "32px" }}>

                {/* ESQUERDA: capa + avaliação + status + progresso */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* Upload de capa */}
                  <label style={{ cursor: "pointer", display: "block" }}>
                    <div onClick={() => fileRef.current?.click()} style={{
                      aspectRatio: "2/3", borderRadius: 6, overflow: "hidden",
                      maxHeight: 300,
                      border: `2px dashed ${OUTLINE2}`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                      background: SC, position: "relative", transition: "border-color .2s",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = PRIMARY; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = OUTLINE2; }}
                    >
                      {preview ? (
                        <img src={preview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <>
                          <span style={{ fontSize: 40, color: INK2 }}>📷</span>
                          <span style={{ fontFamily: LABEL, fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: INK2 }}>Adicionar capa</span>
                        </>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files?.[0]) handleImage(e.target.files[0]); }} />
                  </label>

                  {/* Ficha lateral */}
                  <div style={{ background: SC, border: `1px solid ${OUTLINE}`, borderRadius: 8, padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Avaliação */}
                    <div>
                      <span style={lbl}>Minha avaliação</span>
                      <Stars rating={form.rating} onRate={(n) => setForm((f) => ({ ...f, rating: f.rating === n ? null : n }))} />
                    </div>

                    {/* Status */}
                    <div style={{ borderTop: `1px solid ${OUTLINE}`, paddingTop: 20 }}>
                      <span style={lbl}>Status</span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {STATUS_OPTS.map((opt) => {
                          const active = form.status === opt.value;
                          return (
                            <button key={opt.value} type="button" onClick={() => setForm((f) => ({ ...f, status: opt.value }))} style={{
                              padding: "10px 8px", borderRadius: 6, cursor: "pointer",
                              fontFamily: LABEL, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
                              background: active ? "rgba(179,136,255,0.14)" : "transparent",
                              color:  active ? PRIMARY : INK2,
                              border: active ? `1px solid rgba(179,136,255,0.35)` : `1px solid ${OUTLINE}`,
                              transition: "all .15s",
                            }}>{opt.label}</button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progresso */}
                    <div style={{ borderTop: `1px solid ${OUTLINE}`, paddingTop: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={lbl}>Progresso</span>
                        <span style={{ fontFamily: LABEL, fontSize: 11, fontWeight: 700, color: READ_BAR }}>{progressPct}%</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="number" min="0" value={form.current_page} placeholder="Pág. atual" style={{ ...inp, fontSize: 13 }}
                          onChange={(e) => setForm((f) => ({ ...f, current_page: e.target.value }))} />
                        <span style={{ color: INK2, flexShrink: 0 }}>/</span>
                        <input type="number" min="0" value={form.total_pages} placeholder="Total" style={{ ...inp, fontSize: 13 }}
                          onChange={(e) => setForm((f) => ({ ...f, total_pages: e.target.value }))} />
                      </div>
                      <div style={{ marginTop: 10, height: 3, background: `${READ_BAR}22`, borderRadius: 999 }}>
                        <div style={{ height: "100%", width: `${progressPct}%`, background: READ_BAR, borderRadius: 999, transition: "width .3s" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DIREITA: identidade + notas */}
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {/* Título */}
                  <div>
                    <span style={lbl}>Título *</span>
                    <input type="text" value={form.title} placeholder="Ex: O Nome da Rosa"
                      style={{ ...fieldInp, fontSize: 24, fontStyle: "italic" }}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      onFocus={(e)  => { (e.target as HTMLInputElement).style.borderBottomColor = PRIMARY; }}
                      onBlur={(e)   => { (e.target as HTMLInputElement).style.borderBottomColor = OUTLINE; }}
                    />
                  </div>

                  {/* Autor */}
                  <div>
                    <span style={lbl}>Autor</span>
                    <input type="text" value={form.author} placeholder="Nome do autor"
                      style={{ ...fieldInp, fontSize: 17, fontFamily: BODY }}
                      onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                      onFocus={(e)  => { (e.target as HTMLInputElement).style.borderBottomColor = PRIMARY; }}
                      onBlur={(e)   => { (e.target as HTMLInputElement).style.borderBottomColor = OUTLINE; }}
                    />
                  </div>

                  {/* Impressões */}
                  <div>
                    <span style={lbl}>Sinopse / impressões</span>
                    <textarea rows={4} value={form.description} placeholder="Sobre o livro, citações marcantes, o que ele te deixou..."
                      style={{ ...inp, resize: "vertical", minHeight: 100, lineHeight: 1.6, fontSize: 14 }}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>

                  {/* Resumo pessoal (só quando lido) */}
                  {form.status === "read" && (
                    <div>
                      <span style={lbl}>Resumo pessoal</span>
                      <textarea rows={4} value={form.summary} placeholder="O que você aprendeu, sentiu, levou..."
                        style={{ ...inp, resize: "vertical", minHeight: 100, lineHeight: 1.6, fontSize: 14 }}
                        onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
                    </div>
                  )}

                  {preview && (
                    <button onClick={() => { setPreview(null); setForm((f) => ({ ...f, cover_image: null, cover_thumbnail: null })); }}
                      style={{ background: "none", border: "none", color: INK2, fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: LABEL, textDecoration: "underline" }}>
                      Remover capa
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: "16px 32px", borderTop: `1px solid ${OUTLINE}`, background: SC, display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
              {modal === "edit" && editing && (
                <button onClick={() => handleDelete(editing.id)} disabled={deleting === editing.id} style={{
                  background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
                  color: "#f87171", borderRadius: 6, padding: "11px 18px",
                  fontFamily: LABEL, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
                }}>Excluir</button>
              )}
              <button onClick={() => setModal(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: LABEL, fontSize: 11, color: INK2, letterSpacing: ".12em", textTransform: "uppercase", padding: "11px 18px",
              }}>Descartar</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{
                background: saving || !form.title.trim() ? "rgba(109,40,217,0.4)" : "linear-gradient(90deg, #6d28d9, #8b5cf6)",
                color: "#e0d0ff", border: "none", borderRadius: 6,
                padding: "11px 28px", fontFamily: LABEL, fontSize: 11, fontWeight: 700,
                letterSpacing: ".12em", textTransform: "uppercase",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 0 12px rgba(109,40,217,0.4)",
                transition: "opacity .15s",
              }}>{saving ? "Salvando..." : "Salvar livro"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
