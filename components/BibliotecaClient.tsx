"use client";

import { useState, useRef } from "react";
import type { Book } from "@/lib/db";
import { compressImage } from "@/lib/image";

type BookRow = Omit<Book, "cover_image">;

const STATUS_LABEL: Record<string, string> = {
  want: "Quero Ler",
  reading: "Lendo",
  read: "Lido",
};

const STATUS_COLOR: Record<string, string> = {
  want: "#8b5cf6",
  reading: "#45cdf0",
  read: "#25d99a",
};

const TABS = [
  { key: "all", label: "Todos" },
  { key: "reading", label: "Lendo" },
  { key: "want", label: "Quero Ler" },
  { key: "read", label: "Lidos" },
] as const;

function Stars({ rating, onRate }: { rating: number | null; onRate?: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onRate?.(n)}
          style={{
            fontSize: 14,
            cursor: onRate ? "pointer" : "default",
            color: (rating ?? 0) >= n ? "#ffce47" : "var(--border)",
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
    width: "100%", padding: "8px 10px", borderRadius: 8,
    background: "var(--bg-card)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontSize: 13, outline: "none",
  };

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
    letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4, display: "block",
  };

  return (
    <div style={{ padding: "24px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>📚 Biblioteca</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{books.length} livro{books.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openAdd} style={{
          background: "var(--accent-violet)", color: "#fff",
          border: "none", borderRadius: 10, padding: "8px 16px",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>+ Adicionar</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: "1px solid var(--border)", cursor: "pointer",
              background: tab === t.key ? "var(--accent-violet)" : "var(--bg-card)",
              color: tab === t.key ? "#fff" : "var(--text-muted)",
              transition: "all .15s",
            }}
          >{t.label} {t.key !== "all" && <span style={{ opacity: .7 }}>({books.filter(b => b.status === t.key).length})</span>}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
          <p style={{ fontSize: 14 }}>Nenhum livro aqui ainda.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 14,
        }}>
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => openEdit(b)}
              style={{
                borderRadius: 12, overflow: "hidden",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                cursor: "pointer", transition: "transform .15s, box-shadow .15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
            >
              {/* Cover */}
              <div style={{ height: 180, position: "relative", overflow: "hidden" }}>
                {b.cover_thumbnail ? (
                  <img src={b.cover_thumbnail} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    background: "linear-gradient(135deg, #1a2540, #2a1a50)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 48, color: "rgba(255,255,255,.15)",
                  }}>📖</div>
                )}
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  background: STATUS_COLOR[b.status], color: "#000",
                  fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6,
                  letterSpacing: ".04em",
                }}>{STATUS_LABEL[b.status]}</span>
              </div>

              {/* Info */}
              <div style={{ padding: "10px 10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 3 }}>
                  {b.title}
                </div>
                {b.author && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{b.author}</div>
                )}
                {b.status === "reading" && b.total_pages && (
                  <div>
                    <div style={{ height: 3, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(100, Math.round((b.current_page / b.total_pages) * 100))}%`,
                        background: STATUS_COLOR.reading, borderRadius: 999,
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>
                      {b.current_page}/{b.total_pages} pág.
                    </div>
                  </div>
                )}
                {b.status === "read" && b.rating && (
                  <Stars rating={b.rating} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,.7)", display: "flex",
            alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div style={{
            background: "var(--bg-surface)", borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 560,
            maxHeight: "90vh", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                {modal === "add" ? "Novo Livro" : "Editar Livro"}
              </span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Cover upload */}
              <div>
                <span style={label}>Capa</span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: 72, height: 100, borderRadius: 8, overflow: "hidden",
                      border: "2px dashed var(--border)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "var(--bg-card)", flexShrink: 0,
                    }}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 24 }}>📷</span>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
                    >Escolher imagem</button>
                    {imagePreview && (
                      <button
                        onClick={() => { setImagePreview(null); setForm((f) => ({ ...f, cover_image: null, cover_thumbnail: null })); }}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", marginLeft: 8 }}
                      >Remover</button>
                    )}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handleImage(e.target.files[0]); }} />
              </div>

              {/* Title */}
              <div>
                <span style={label}>Título *</span>
                <input style={inp} value={form.title} placeholder="Nome do livro"
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Author */}
              <div>
                <span style={label}>Autor</span>
                <input style={inp} value={form.author} placeholder="Nome do autor"
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
              </div>

              {/* Status */}
              <div>
                <span style={label}>Status</span>
                <select style={inp} value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}>
                  <option value="want">Quero Ler</option>
                  <option value="reading">Lendo</option>
                  <option value="read">Lido</option>
                </select>
              </div>

              {/* Pages */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

              {/* Rating (only for read) */}
              {form.status === "read" && (
                <div>
                  <span style={label}>Avaliação</span>
                  <Stars rating={form.rating} onRate={(n) => setForm((f) => ({ ...f, rating: f.rating === n ? null : n }))} />
                </div>
              )}

              {/* Description */}
              <div>
                <span style={label}>Descrição</span>
                <textarea style={{ ...inp, resize: "vertical", minHeight: 64 }} value={form.description}
                  placeholder="Sinopse ou comentário..."
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Summary (only for read) */}
              {form.status === "read" && (
                <div>
                  <span style={label}>Resumo pessoal</span>
                  <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }} value={form.summary}
                    placeholder="O que você achou, aprendeu, sentiu..."
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{
              padding: "12px 20px", borderTop: "1px solid var(--border)",
              display: "flex", gap: 10, flexShrink: 0,
            }}>
              {modal === "edit" && editing && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  disabled={deleting === editing.id}
                  style={{
                    background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)",
                    color: "#ef4444", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer",
                  }}
                >Excluir</button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                style={{
                  flex: 1, background: "var(--accent-violet)", color: "#fff",
                  border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
                }}
              >{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
