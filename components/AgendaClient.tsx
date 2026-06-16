"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { format, isToday, isTomorrow, isPast, isThisWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduledTask {
  id: number;
  name: string;
  emoji: string | null;
  due_date: string;
  due_time: string | null;
  category: string | null;
  notes: string | null;
  notify_enabled: boolean;
  notify_date: string | null;
  notify_time: string | null;
  notify_repeat: boolean;
  completed_at: string | null;
  created_at: string;
}

type Urgency = "overdue" | "today" | "tomorrow" | "week" | "later";

interface AgendaClientProps {
  initialTasks: ScheduledTask[];
}

// Cores por categoria (texto livre — heurística por palavras-chave)
function getCategoryColor(cat: string | null): string {
  if (!cat) return "#94a3b8";
  const c = cat.toLowerCase();
  if (c.includes("saúde") || c.includes("saude") || c.includes("médico") || c.includes("medico") || c.includes("fisio")) return "#10b981";
  if (c.includes("trabalho") || c.includes("reunião") || c.includes("reuniao")) return "#3b82f6";
  if (c.includes("financeiro") || c.includes("finance") || c.includes("banco") || c.includes("conta")) return "#f59e0b";
  if (c.includes("veículo") || c.includes("veiculo") || c.includes("carro") || c.includes("moto")) return "#f97316";
  if (c.includes("casa") || c.includes("família") || c.includes("familia")) return "#a855f7";
  if (c.includes("lazer") || c.includes("viagem") || c.includes("férias") || c.includes("ferias")) return "#06b6d4";
  return "#7c3aed";
}

const CATEGORY_SUGGESTIONS = [
  "Pessoal", "Saúde", "Trabalho", "Financeiro",
  "Veículo", "Casa", "Família", "Lazer", "Médico", "Viagem",
];

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string; dimColor: string }> = {
  overdue:  { label: "Atrasadas",     color: "#ef4444", dimColor: "rgba(239,68,68,.1)" },
  today:    { label: "Hoje",          color: "#f59e0b", dimColor: "rgba(245,158,11,.1)" },
  tomorrow: { label: "Amanhã",        color: "#06b6d4", dimColor: "rgba(6,182,212,.1)" },
  week:     { label: "Esta Semana",   color: "#3b82f6", dimColor: "rgba(59,130,246,.1)" },
  later:    { label: "Mais Adiante",  color: "#94a3b8", dimColor: "rgba(148,163,184,.06)" },
};

const EMOJI_GROUPS = [
  { label: "Agenda",    emojis: ["📌", "📋", "✅", "🗓️", "⏰", "📞", "📩", "🔔", "📝", "🎯"] },
  { label: "Transporte",emojis: ["🚗", "🚕", "✈️", "🚌", "🚂", "⛽", "🔧", "🛞", "🛻", "🏎️"] },
  { label: "Casa",      emojis: ["🏠", "🔑", "🛒", "🧹", "🛠️", "💡", "📦", "🪑", "🛋️", "🌱"] },
  { label: "Saúde",     emojis: ["🏥", "💊", "🩺", "🦷", "👓", "🧬", "💉", "🩻", "❤️", "🧘"] },
  { label: "Trabalho",  emojis: ["💼", "📊", "💻", "🖨️", "📈", "🤝", "🏢", "📜", "🔏", "💡"] },
  { label: "Finanças",  emojis: ["💰", "🏦", "💳", "📑", "🧾", "💵", "📤", "🪙", "📉", "🤑"] },
  { label: "Família",   emojis: ["👨‍👩‍👧", "🎂", "🎁", "🥳", "❤️", "🤗", "👶", "🐶", "🐱", "🌺"] },
  { label: "Lazer",     emojis: ["🎬", "🎮", "🏖️", "✈️", "🍕", "🎵", "📷", "⛰️", "🎪", "🃏"] },
];

function getUrgency(task: ScheduledTask): Urgency {
  const d = parseISO(task.due_date);
  if (isPast(d) && !isToday(d)) return "overdue";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "week";
  return "later";
}

function formatDueDate(task: ScheduledTask): string {
  const d = parseISO(task.due_date);
  const dateStr = format(d, "d 'de' MMM", { locale: ptBR });
  return task.due_time ? `${dateStr} às ${task.due_time}` : dateStr;
}

const EMPTY_FORM = {
  name: "", emoji: "", due_date: "", due_time: "", category: "", notes: "",
  notify_enabled: false, notify_date: "", notify_time: "", notify_repeat: false,
};

export function AgendaClient({ initialTasks }: AgendaClientProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const pendingTasks = tasks.filter((t) => !t.completed_at);
  const completedTasks = tasks.filter((t) => t.completed_at);

  const sections = useMemo(() => {
    const groups: Record<Urgency, ScheduledTask[]> = {
      overdue: [], today: [], tomorrow: [], week: [], later: [],
    };
    for (const t of pendingTasks) groups[getUrgency(t)].push(t);
    return groups;
  }, [pendingTasks]);

  function openAdd() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(task: ScheduledTask) {
    setEditingTask(task);
    setForm({
      name: task.name,
      emoji: task.emoji ?? "",
      due_date: task.due_date,
      due_time: task.due_time ?? "",
      category: task.category ?? "",
      notes: task.notes ?? "",
      notify_enabled: task.notify_enabled ?? false,
      notify_date: task.notify_date ?? "",
      notify_time: task.notify_time ?? "",
      notify_repeat: task.notify_repeat ?? false,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.due_date) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        emoji: form.emoji.trim() || null,
        due_date: form.due_date,
        due_time: form.due_time || null,
        category: form.category.trim() || null,
        notes: form.notes.trim() || null,
        notify_enabled: form.notify_enabled,
        notify_date: form.notify_enabled ? (form.notify_date || null) : null,
        notify_time: form.notify_enabled ? (form.notify_time || null) : null,
        notify_repeat: form.notify_enabled ? form.notify_repeat : false,
      };

      if (editingTask) {
        const res = await fetch(`/api/agenda/${editingTask.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const data = await res.json();
        setTasks((prev) => prev.map((t) => t.id === editingTask.id ? data.task : t));
      } else {
        const res = await fetch("/api/agenda", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const data = await res.json();
        setTasks((prev) => [...prev, data.task]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task: ScheduledTask) {
    setCompletingId(task.id);
    const action = task.completed_at ? "uncomplete" : "complete";
    const res = await fetch(`/api/agenda/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setTasks((prev) => prev.map((t) => t.id === task.id ? data.task : t));
    setCompletingId(null);
  }

  async function handleDelete(task: ScheduledTask) {
    if (!confirm(`Excluir "${task.name}"?`)) return;
    await fetch(`/api/agenda/${task.id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  const urgencyOrder: Urgency[] = ["overdue", "today", "tomorrow", "week", "later"];

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">[ AGENDA ]</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", letterSpacing: ".06em" }}>
            Tarefas e compromissos
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            padding: "8px 18px", borderRadius: "10px", fontSize: "12.5px", fontWeight: 700,
            background: "rgba(0,184,232,.15)", border: "1px solid rgba(0,184,232,.35)",
            color: "var(--accent-teal)", cursor: "pointer", letterSpacing: ".08em",
            fontFamily: "var(--font-space-grotesk), sans-serif", textTransform: "uppercase",
          }}
        >
          + Nova Tarefa
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {(["overdue", "today"] as Urgency[]).map((u) => sections[u].length > 0 && (
          <div key={u} style={{
            padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
            background: URGENCY_CONFIG[u].dimColor, border: `1px solid ${URGENCY_CONFIG[u].color}44`,
            color: URGENCY_CONFIG[u].color, letterSpacing: ".06em",
          }}>
            {sections[u].length} {URGENCY_CONFIG[u].label.toLowerCase()}
          </div>
        ))}
        {pendingTasks.length === 0 && (
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Nenhuma tarefa pendente</div>
        )}
      </div>

      {/* Sections */}
      {urgencyOrder.map((urgency) => {
        const items = sections[urgency];
        if (items.length === 0) return null;
        const cfg = URGENCY_CONFIG[urgency];
        return (
          <div key={urgency} className="section">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "3px", height: "16px", borderRadius: "2px", background: cfg.color }} />
              <h2 style={{ margin: 0, fontSize: "13px", color: cfg.color, letterSpacing: ".1em", textTransform: "uppercase" }}>
                {cfg.label}
              </h2>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  urgency={urgency}
                  completing={completingId === task.id}
                  onComplete={() => handleComplete(task)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => handleDelete(task)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Concluídas */}
      {completedTasks.length > 0 && (
        <div className="section">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: "8px", background: "none",
              border: "none", cursor: "pointer", padding: "0", marginBottom: showCompleted ? "12px" : "0",
            }}
          >
            <div style={{ width: "3px", height: "16px", borderRadius: "2px", background: "#10b981" }} />
            <h2 style={{ margin: 0, fontSize: "13px", color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Concluídas
            </h2>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{completedTasks.length}</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>
              {showCompleted ? "▲" : "▼"}
            </span>
          </button>
          {showCompleted && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  urgency="later"
                  completing={completingId === task.id}
                  done
                  onComplete={() => handleComplete(task)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => handleDelete(task)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {pendingTasks.length === 0 && completedTasks.length === 0 && (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ fontSize: "36px", marginBottom: "12px" }}>📅</p>
          <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", letterSpacing: ".1em", fontFamily: "var(--font-space-grotesk), sans-serif", textTransform: "uppercase" }}>
            Agenda Vazia
          </p>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", letterSpacing: ".04em" }}>
            Adicione tarefas e compromissos futuros
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "480px", padding: "28px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <p className="eyebrow" style={{ marginBottom: "20px" }}>
              {editingTask ? "[ EDITAR TAREFA ]" : "[ NOVA TAREFA ]"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Emoji picker + Nome */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0 }}>
                  <label style={labelStyle}>Emoji</label>
                  <EmojiPicker value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e })) } />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nome *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Levar carro na revisão"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
              </div>

              {/* Data + Hora */}
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Data *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ width: "110px" }}>
                  <label style={labelStyle}>Hora</label>
                  <input
                    type="time"
                    value={form.due_time}
                    onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Notificação */}
              <div style={{
                borderRadius: "10px", overflow: "hidden",
                border: `1px solid ${form.notify_enabled ? "rgba(0,240,192,.35)" : "var(--border)"}`,
                transition: "border-color .15s",
              }}>
                {/* Toggle row */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !form.notify_enabled;
                    setForm((f) => ({
                      ...f,
                      notify_enabled: next,
                      // pré-preenche com a data/hora da tarefa se não tiver
                      notify_date: next && !f.notify_date ? f.due_date : f.notify_date,
                      notify_time: next && !f.notify_time ? f.due_time : f.notify_time,
                    }));
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 14px", width: "100%",
                    background: form.notify_enabled ? "rgba(0,240,192,.06)" : "var(--bg-card)",
                    border: "none", cursor: "pointer", textAlign: "left", transition: "background .15s",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{form.notify_enabled ? "🔔" : "🔕"}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {form.notify_enabled ? "Notificação ativa" : "Ativar lembrete"}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      {form.notify_enabled
                        ? form.notify_date && form.notify_time
                          ? `Aviso em ${form.notify_date === form.due_date ? "mesmo dia" : form.notify_date} às ${form.notify_time}`
                          : "Defina data e hora abaixo"
                        : "Escolha quando quer ser avisado"}
                    </p>
                  </div>
                  <div style={{
                    width: "36px", height: "20px", borderRadius: "10px",
                    background: form.notify_enabled ? "var(--accent-teal)" : "var(--border)",
                    position: "relative", flexShrink: 0, transition: "background .15s",
                  }}>
                    <div style={{
                      position: "absolute", top: "2px",
                      left: form.notify_enabled ? "18px" : "2px",
                      width: "16px", height: "16px", borderRadius: "50%",
                      background: "white", transition: "left .15s",
                    }} />
                  </div>
                </button>

                {/* Data + hora + repeat — expande quando ativo */}
                {form.notify_enabled && (
                  <div style={{
                    display: "flex", flexDirection: "column", gap: "10px",
                    padding: "12px 14px",
                    background: "rgba(0,240,192,.04)",
                    borderTop: "1px solid rgba(0,240,192,.15)",
                  }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Data do aviso</label>
                        <input
                          type="date"
                          value={form.notify_date}
                          onChange={(e) => setForm((f) => ({ ...f, notify_date: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ width: "110px" }}>
                        <label style={labelStyle}>Hora do aviso</label>
                        <input
                          type="time"
                          value={form.notify_time}
                          onChange={(e) => setForm((f) => ({ ...f, notify_time: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    {/* Toggle repetir */}
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, notify_repeat: !f.notify_repeat }))}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 12px", borderRadius: "8px", width: "100%",
                        background: form.notify_repeat ? "rgba(245,158,11,.08)" : "transparent",
                        border: `1px solid ${form.notify_repeat ? "rgba(245,158,11,.35)" : "var(--border)"}`,
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>🔁</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                          Repetir lembrete
                        </p>
                        <p style={{ fontSize: "10.5px", color: "var(--text-muted)", margin: "1px 0 0" }}>
                          {form.notify_repeat ? "Avisa 2x mais: +5min e +10min depois" : "Avisa só uma vez"}
                        </p>
                      </div>
                      <div style={{
                        width: "32px", height: "18px", borderRadius: "9px",
                        background: form.notify_repeat ? "#f59e0b" : "var(--border)",
                        position: "relative", flexShrink: 0, transition: "background .15s",
                      }}>
                        <div style={{
                          position: "absolute", top: "2px",
                          left: form.notify_repeat ? "16px" : "2px",
                          width: "14px", height: "14px", borderRadius: "50%",
                          background: "white", transition: "left .15s",
                        }} />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Categoria — texto livre com sugestões */}
              <div>
                <label style={labelStyle}>Categoria</label>
                <input
                  list="cat-suggestions"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Ex: Veículo, Médico, Casa..."
                  style={inputStyle}
                />
                <datalist id="cat-suggestions">
                  {CATEGORY_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>

              {/* Notas */}
              <div>
                <label style={labelStyle}>Notas (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Detalhes, endereço, lembrete..."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={closeForm} style={{ ...btnStyle, flex: 1, background: "transparent", border: "1px solid rgba(120,150,180,.25)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.due_date}
                style={{ ...btnStyle, flex: 2, background: "rgba(0,184,232,.15)", border: "1px solid rgba(0,184,232,.35)", color: "var(--accent-teal)", opacity: (saving || !form.name.trim() || !form.due_date) ? 0.5 : 1 }}
              >
                {saving ? "Salvando..." : editingTask ? "Salvar" : "Criar Tarefa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: ScheduledTask;
  urgency: Urgency;
  done?: boolean;
  completing: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TaskCard({ task, urgency, done, completing, onComplete, onEdit, onDelete }: TaskCardProps) {
  const cfg = URGENCY_CONFIG[urgency];
  const catColor = getCategoryColor(task.category);

  return (
    <div
      className="card"
      style={{
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        opacity: done ? 0.55 : 1,
        transition: "opacity .2s",
        borderLeft: `3px solid ${done ? "#10b981" : cfg.color}`,
      }}
    >
      {/* Complete button */}
      <button
        onClick={onComplete}
        disabled={completing}
        style={{
          flexShrink: 0, width: "26px", height: "26px", borderRadius: "50%",
          border: `2px solid ${done ? "#10b981" : cfg.color}`,
          background: done ? "#10b981" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: "1px", transition: "all .15s",
          color: "white", fontSize: "13px", fontWeight: 700,
        }}
      >
        {done ? "✓" : completing ? "…" : ""}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {task.emoji && <span style={{ fontSize: "16px" }}>{task.emoji}</span>}
          <span style={{
            fontWeight: 700, fontSize: "14px", color: "var(--text-primary)",
            textDecoration: done ? "line-through" : "none", letterSpacing: ".03em",
          }}>
            {task.name}
          </span>
          {task.category && (
            <span style={{
              fontSize: "10px", padding: "2px 7px", borderRadius: "5px", fontWeight: 600,
              background: `${catColor}22`, color: catColor, letterSpacing: ".07em",
              textTransform: "uppercase", fontFamily: "var(--font-space-grotesk), sans-serif",
            }}>
              {task.category}
            </span>
          )}
        </div>
        <div style={{ fontSize: "11.5px", color: done ? "var(--text-muted)" : cfg.color, marginTop: "4px", fontWeight: 500 }}>
          📅 {formatDueDate(task)}
          {done && task.completed_at && (
            <span style={{ color: "#10b981", marginLeft: "10px" }}>✓ concluída</span>
          )}
        </div>
        {task.notes && (
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "5px", lineHeight: 1.45 }}>
            {task.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
        {!done && (
          <button onClick={onEdit} style={iconBtnStyle} title="Editar">✏️</button>
        )}
        <button onClick={onDelete} style={{ ...iconBtnStyle, opacity: 0.6 }} title="Excluir">✕</button>
      </div>
    </div>
  );
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState(0);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "52px", height: "42px", borderRadius: "8px", fontSize: "22px",
          textAlign: "center", cursor: "pointer",
          background: "var(--bg-card)",
          border: `1px solid ${open ? "rgba(0,184,232,.5)" : "var(--border)"}`,
          color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {value || "➕"}
      </button>

      {open && (
        <div style={{
          position: "absolute", zIndex: 200, top: "calc(100% + 6px)", left: 0,
          width: "260px", background: "var(--bg-card)", border: "1px solid var(--border-light)",
          borderRadius: "12px", boxShadow: "0 12px 40px rgba(0,0,0,.6)", overflow: "hidden",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTab(i)}
                style={{
                  flex: "1 0 auto", padding: "7px 5px", fontSize: "9.5px",
                  fontWeight: tab === i ? 700 : 400,
                  color: tab === i ? "var(--accent-teal)" : "var(--text-muted)",
                  background: tab === i ? "rgba(0,184,232,.08)" : "transparent",
                  border: "none", borderBottom: tab === i ? "2px solid var(--accent-teal)" : "2px solid transparent",
                  cursor: "pointer", letterSpacing: ".04em", whiteSpace: "nowrap",
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "4px", padding: "10px" }}>
            {EMOJI_GROUPS[tab].emojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); setOpen(false); }}
                style={{
                  fontSize: "22px", padding: "6px", borderRadius: "8px", border: "none",
                  background: value === e ? "rgba(0,184,232,.15)" : "transparent",
                  cursor: "pointer", transition: "background .12s",
                }}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = "rgba(255,255,255,.07)")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = value === e ? "rgba(0,184,232,.15)" : "transparent")}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Input manual */}
          <div style={{ padding: "0 10px 10px", borderTop: "1px solid var(--border)" }}>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Ou cole qualquer emoji"
              maxLength={2}
              style={{
                width: "100%", padding: "7px 10px", marginTop: "8px",
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", outline: "none",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "8px", fontSize: "13px",
  background: "var(--bg-card)", border: "1px solid var(--border)",
  color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "10.5px", color: "var(--text-muted)", marginBottom: "5px",
  letterSpacing: ".09em", textTransform: "uppercase", fontFamily: "var(--font-space-grotesk), sans-serif",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 16px", borderRadius: "9px", fontSize: "12.5px", fontWeight: 700,
  cursor: "pointer", letterSpacing: ".08em", fontFamily: "var(--font-space-grotesk), sans-serif",
  textTransform: "uppercase", transition: "opacity .15s",
};

const iconBtnStyle: React.CSSProperties = {
  width: "28px", height: "28px", borderRadius: "7px", border: "1px solid var(--border)",
  background: "transparent", cursor: "pointer", fontSize: "12px",
  display: "flex", alignItems: "center", justifyContent: "center",
};
