"use client";

import { useState, useRef } from "react";
import type { Book } from "@/lib/db";
import { compressImage } from "@/lib/image";

type BookRow = Omit<Book, "cover_image">;

/* ===========================================================
   BIBLIOTECA — identidade "Papel"
   Creme literário · âmbar/madeira · títulos em Spectral.
   Superfície CLARA própria (contrasta com o resto do app,
   intencional — sensação de papel/estante).
   =========================================================== */

const PAPER = "#f1e7d3";
const PAPER_CARD = "#fbf5e8";
const PAPER_BORDER = "#e2d3b6";
const INK = "#2c2114";
const INK_SOFT = "#3a2c18";
const AMBER = "#b5731f";
const MUTED = "#9a875e";
const SERIF = "'Spectral', Georgia, serif";

const STATUS_LABEL: Record<string, string> = { want: "Quero Ler", reading: "Lendo", read: "Lido" };
const STATUS_COLOR: Record<string, string> = { want: "#7a5fa8", reading: AMBER, read: "#2e7d4a" };
const STATUS_SPINE: Record<string, string> = {
  want: "linear-gradient(180deg,#3a3460,#5a4f8a)",
  reading: "linear-gradient(180deg,#7a3b16,#a85a22)",
  read: "linear-gradient(180deg,#2e5a34,#4a8a52)",
};

const TABS = [
  { key: "all", label: "Todos" },
  { key: "reading", label: "Lendo" },
  { key: "want", label: "Quero Ler" },
  { key: "read", label: "Lidos" },
] as const;

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
            color: (rating ?? 0) >= n ? "#d39a2e" : "#d8c6a0",
          }}
        >★</span>
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

const EMPTY_FORM: FormState = {
  title: "", author: "", status: "want",
  total_pages: "", current_page: "",
  rating: null, description: "", summary: "",
  cover_image: null, cover_thumbnail: null,
};

export function BibliotecaClient({ initialBooks }: { initialBooks: BookRow[] }) {
  const [books, setBooks] = useState(initialBooks);
  const [tab, setTab] = useState<"all" | "reading" | "want" | "read">("all");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = tab === "all" ? books : books.filter((b) => b.status === tab);
  const readingCount = books.filter((b) => b.status === "reading").length;

  async function refresh() {
    const res = await fetch("/api/books");
    setBooks(await res.json());
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setEditing(null);
    setModal("add");
  }

  function openEdit(b: BookRow) {
    setForm({
      title: b.title,
      author: b.author ?? "",
      status: b.status,
      total_pages: b.total_pages?.toString() ?? "",
      current_page: b.current_page?.toString() ?? "",
      rating: b.rating,
      description: b.description ?? "",
      summary: b.summary ?? "",
      cover_image: null,
      cover_thumbnail: b.cover_thumbnail ?? null,
    });
    setImagePreview(b.cover_thumbnail ?? null);
    setEditing(b);
    setModal("edit");
  }

  async function handleImage(file: File) {
    const full = await compressImage(file, 600, 0.82);
    const thumb = await compressImage(file, 120, 0.65);
    setForm((f) => ({ ...f, cover_image: full, cover_thumbnail: thumb }));
    setImagePreview(thumb);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        total_pages: form.total_pages ? Number(form.total_pages) : null,
        current_page: form.current_page ? Number(form.current_page) : 0,
      };
      if (modal === "edit" && editing) {
        await fetch(`/api/books/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/books", {
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
    if (!confirm("Excluir este livro?")) return;
    setDeleting(id);
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    await refresh();
    setDeleting(null);
    setModal(null);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 9,
    background: PAPER_CARD, border: `1px solid #ddcba6`,
    color: INK, fontSize: 14, outline: "none",
  };

  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: MUTED,
    letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 7, display: "block",
  };

  return (
    <div style={{
      maxWidth: 900, margin: "24px auto", padding: "30px 28px 32px",
      background: PAPER, border: `1px solid ${PAPER_BORDER}`, borderRadius: 18,
      fontFamily: "var(--font-manrope), system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".32em", textTransform: "uppercase", color: AMBER, marginBottom: 8 }}>Estante</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 36, lineHeight: 0.9, color: INK_SOFT, margin: 0 }}>Biblioteca</h1>
          <p style={{ fontSize: 12, color: "#8a7752", margin: "8px 0 0", letterSpacing: ".04em" }}>
            {books.length} livro{books.length !== 1 ? "s" : ""}{readingCount > 0 ? ` · ${readingCount} em leitura` : ""}
          </p>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 7,
          background: INK_SOFT, color: PAPER, border: "none", borderRadius: 10,
          padding: "11px 18px", fontSize: 12, fontWeight: 700, letterSpacing: ".04em", cursor: "pointer",
        }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Adicionar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = t.key !== "all" ? books.filter((b) => b.status === t.key).length : 0;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 600,
              border: "none", cursor: "pointer",
              background: active ? AMBER : "#e7d9bc",
              color: active ? PAPER : "#7a6740",
            }}>{t.label}{t.key !== "all" && ` ${count}`}</button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 6, opacity: 0.5 }}>📖</div>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: "#a8946a" }}>Nenhum livro na estante ainda.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {filtered.map((b) => (
            <div key={b.id} onClick={() => openEdit(b)} style={{
              display: "flex", borderRadius: 10, overflow: "hidden",
              background: PAPER_CARD, border: `1px solid ${PAPER_BORDER}`,
              cursor: "pointer", boxShadow: "0 4px 12px -6px rgba(60,40,16,.2)",
              transition: "transform .15s, box-shadow .15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 22px -8px rgba(60,40,16,.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px -6px rgba(60,40,16,.2)"; }}
            >
              {/* Spine — colored gradient or cover slice */}
              <div style={{ width: 10, flexShrink: 0, background: b.cover_thumbnail ? "transparent" : STATUS_SPINE[b.status] }}>
                {b.cover_thumbnail && <img src={b.cover_thumbnail} alt="" style={{ width: 10, height: "100%", objectFit: "cover" }} />}
              </div>

              {/* Info */}
              <div style={{ padding: "14px 14px 15px", flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: ".06em",
                  color: STATUS_COLOR[b.status], background: `${STATUS_COLOR[b.status]}22`,
                  padding: "3px 8px", borderRadius: 999, textTransform: "uppercase",
                }}>{STATUS_LABEL[b.status]}</span>
                <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 19, color: INK, marginTop: 11, lineHeight: 1.1 }}>{b.title}</div>
                {b.author && <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{b.author}</div>}

                {b.status === "reading" && b.total_pages && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 5, background: PAPER_BORDER, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(100, Math.round((b.current_page / b.total_pages) * 100))}%`,
                        background: AMBER, borderRadius: 999,
                      }} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginTop: 5 }}>{b.current_page} / {b.total_pages} pág.</div>
                  </div>
                )}
                {b.status === "read" && b.rating != null && <div style={{ marginTop: 11 }}><Stars rating={b.rating} /></div>}
                {b.status === "want" && <div style={{ fontSize: 11, color: "#b3a079", marginTop: 11, fontStyle: "italic" }}>na lista de desejos</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(40,28,12,.55)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: PAPER, borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden",
            border: `1px solid ${PAPER_BORDER}`, borderBottom: "none",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: `1px solid ${PAPER_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 23, color: INK_SOFT }}>
                {modal === "add" ? "Novo Livro" : "Editar Livro"}
              </span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Cover */}
              <div>
                <span style={label}>Capa</span>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div onClick={() => fileRef.current?.click()} style={{
                    width: 72, height: 100, borderRadius: 8, overflow: "hidden",
                    border: "1.5px dashed #cbb78c", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: PAPER_CARD, flexShrink: 0, fontSize: 24, color: "#c2ad7e",
                  }}>
                    {imagePreview ? <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "+"}
                  </div>
                  <div>
                    <button onClick={() => fileRef.current?.click()} style={{
                      background: "none", border: "1px solid rgba(181,115,31,.35)",
                      color: AMBER, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Escolher imagem</button>
                    {imagePreview && (
                      <button onClick={() => { setImagePreview(null); setForm((f) => ({ ...f, cover_image: null, cover_thumbnail: null })); }}
                        style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", marginLeft: 8 }}>Remover</button>
                    )}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handleImage(e.target.files[0]); }} />
              </div>

              <div>
                <span style={label}>Título *</span>
                <input style={{ ...inp, fontFamily: SERIF, fontSize: 16, fontWeight: 600 }} value={form.title} placeholder="Nome do livro"
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <span style={label}>Autor</span>
                <input style={inp} value={form.author} placeholder="Nome do autor"
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
              </div>

              <div>
                <span style={label}>Status</span>
                <select style={{ ...inp, borderColor: "rgba(181,115,31,.45)", color: AMBER, fontWeight: 600 }} value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}>
                  <option value="want">Quero Ler</option>
                  <option value="reading">Lendo</option>
                  <option value="read">Lido</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={label}>Total de páginas</span>
                  <input style={inp} type="number" min="0" value={form.total_pages} placeholder="—"
                    onChange={(e) => setForm((f) => ({ ...f, total_pages: e.target.value }))} />
                </div>
                {form.status === "reading" && (
                  <div>
                    <span style={label}>Página atual</span>
                    <input style={inp} type="number" min="0" value={form.current_page} placeholder="0"
                      onChange={(e) => setForm((f) => ({ ...f, current_page: e.target.value }))} />
                  </div>
                )}
              </div>

              {form.status === "read" && (
                <div>
                  <span style={label}>Avaliação</span>
                  <Stars rating={form.rating} onRate={(n) => setForm((f) => ({ ...f, rating: f.rating === n ? null : n }))} />
                </div>
              )}

              <div>
                <span style={label}>Descrição</span>
                <textarea style={{ ...inp, resize: "vertical", minHeight: 64 }} value={form.description}
                  placeholder="Sinopse ou comentário..."
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              {form.status === "read" && (
                <div>
                  <span style={label}>Resumo pessoal</span>
                  <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }} value={form.summary}
                    placeholder="O que você achou, aprendeu, sentiu..."
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
                </div>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${PAPER_BORDER}`, display: "flex", gap: 10, flexShrink: 0 }}>
              {modal === "edit" && editing && (
                <button onClick={() => handleDelete(editing.id)} disabled={deleting === editing.id} style={{
                  background: "rgba(190,50,40,.1)", border: "1px solid rgba(190,50,40,.3)",
                  color: "#be3228", borderRadius: 9, padding: "11px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>Excluir</button>
              )}
              <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{
                flex: 1, background: INK_SOFT, color: PAPER,
                border: "none", borderRadius: 9, padding: "11px", fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              }}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
