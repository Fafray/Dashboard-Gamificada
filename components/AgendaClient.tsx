"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  format, isToday, isTomorrow, isPast, isThisWeek, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay,
} from "date-fns";
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

function getCategoryColor(): string {
  return "#86a6c8";
}

const CATEGORY_SUGGESTIONS = [
  "Pessoal", "Saúde", "Trabalho", "Financeiro",
  "Veículo", "Casa", "Família", "Lazer", "Médico", "Viagem",
];

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string; dimColor: string }> = {
  overdue:  { label: "Atrasada",     color: "#f0556a", dimColor: "rgba(240,85,106,.10)" },
  today:    { label: "Hoje",         color: "#45cdf0", dimColor: "rgba(69,205,240,.10)" },
  tomorrow: { label: "Amanhã",       color: "#86a6c8", dimColor: "rgba(134,166,200,.08)" },
  week:     { label: "Esta semana",  color: "#86a6c8", dimColor: "rgba(134,166,200,.06)" },
  later:    { label: "Mais adiante", color: "#3a526e", dimColor: "rgba(58,82,110,.06)" },
};

// Kanban shows 4 columns: overdue | today | week (tomorrow+week) | later
const KANBAN_COLS: { key: Urgency | "week_all"; label: string; color: string; urgencies: Urgency[] }[] = [
  { key: "overdue",  label: "Atrasada",      color: "#f0556a", urgencies: ["overdue"] },
  { key: "today",    label: "Hoje",          color: "#45cdf0", urgencies: ["today"] },
  { key: "week_all", label: "Esta semana",   color: "#86a6c8", urgencies: ["tomorrow", "week"] },
  { key: "later",    label: "Mais adiante",  color: "#3a526e", urgencies: ["later"] },
];

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
  const [calMonth, setCalMonth] = useState(new Date());

  const pendingTasks = tasks.filter((t) => !t.completed_at);
  const completedTasks = tasks.filter((t) => t.completed_at);

  const sections = useMemo(() => {
    const groups: Record<Urgency, ScheduledTask[]> = {
      overdue: [], today: [], tomorrow: [], week: [], later: [],
    };
    for (const t of pendingTasks) groups[getUrgency(t)].push(t);
    return groups;
  }, [pendingTasks]);

  function openAdd(prefillDate?: string) {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, due_date: prefillDate ?? "" });
    setShowForm(true);
  }

  function openEdit(task: ScheduledTask) {
    setEditingTask(task);
    setForm({
      name: task.name, emoji: task.emoji ?? "", due_date: task.due_date,
      due_time: task.due_time ?? "", category: task.category ?? "",
      notes: task.notes ?? "", notify_enabled: task.notify_enabled ?? false,
      notify_date: task.notify_date ?? "", notify_time: task.notify_time ?? "",
      notify_repeat: task.notify_repeat ?? false,
    });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingTask(null); }

  async function handleSave() {
    if (!form.name.trim() || !form.due_date) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(), emoji: form.emoji.trim() || null, due_date: form.due_date,
        due_time: form.due_time || null, category: form.category.trim() || null,
        notes: form.notes.trim() || null, notify_enabled: form.notify_enabled,
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

  // Calendar data
  const calDays = useMemo(() => {
    const first = startOfMonth(calMonth);
    const last  = endOfMonth(calMonth);
    const days  = eachDayOfInterval({ start: first, end: last });
    const taskDateSet = new Set(pendingTasks.map((t) => t.due_date));
    const overdueDates = new Set(pendingTasks.filter((t) => getUrgency(t) === "overdue").map((t) => t.due_date));
    return days.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      return {
        date: d, dateStr,
        isToday: isToday(d),
        hasTask: taskDateSet.has(dateStr),
        isOverdue: overdueDates.has(dateStr),
        startPad: getDay(first),
      };
    });
  }, [calMonth, pendingTasks]);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">[ AGENDA ]</p>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>
            Agenda
          </h1>
        </div>
        <button
          onClick={() => openAdd()}
          style={{
            padding: "8px 18px", borderRadius: "10px", fontSize: "12.5px", fontWeight: 700,
            background: "var(--accent-violet)", color: "#04121c",
            border: "none", cursor: "pointer",
            fontFamily: "var(--font-space-grotesk), sans-serif",
          }}
        >
          + Nova tarefa
        </button>
      </div>

      {/* Split layout */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>

        {/* ── Left panel: mini-calendar ── */}
        <div style={{
          width: "210px", flexShrink: 0,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)", padding: "16px",
          position: "sticky", top: "20px",
        }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button
              onClick={() => setCalMonth((m) => subMonths(m, 1))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "14px", padding: "2px 6px" }}
            >
              ‹
            </button>
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
              {format(calMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setCalMonth((m) => addMonths(m, 1))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "14px", padding: "2px 6px" }}
            >
              ›
            </button>
          </div>

          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
            {["D","S","T","Q","Q","S","S"].map((l, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: "9px", color: "var(--text-muted)", fontWeight: 700, fontFamily: "var(--font-space-grotesk)" }}>
                {l}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {/* Padding cells */}
            {Array.from({ length: calDays[0]?.startPad ?? 0 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {calDays.map((d) => (
              <button
                key={d.dateStr}
                onClick={() => openAdd(d.dateStr)}
                title={d.dateStr}
                style={{
                  width: "100%", aspectRatio: "1", borderRadius: "5px",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: d.isToday ? 700 : 400,
                  cursor: "pointer", position: "relative",
                  background: d.isToday ? "var(--accent-violet)" : d.isOverdue ? "rgba(240,85,106,.18)" : "transparent",
                  border: d.isToday ? "1px solid var(--accent-violet-bright)" : "1px solid transparent",
                  color: d.isToday ? "#04121c" : d.isOverdue ? "#f0556a" : "var(--text-secondary)",
                  transition: "background .12s",
                }}
              >
                {d.date.getDate()}
                {d.hasTask && !d.isToday && (
                  <div style={{
                    width: "4px", height: "4px", borderRadius: "50%",
                    background: d.isOverdue ? "#f0556a" : "var(--accent-teal)",
                    position: "absolute", bottom: "2px",
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { color: "#f0556a", label: "Atrasada" },
              { color: "var(--accent-violet)", label: "Hoje" },
              { color: "var(--accent-teal)", label: "Futura" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Kanban columns ── */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", minWidth: 0 }}>
          {KANBAN_COLS.map((col) => {
            const items = col.urgencies.flatMap((u) => sections[u]);
            return (
              <div key={col.key}>
                {/* Column header */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", paddingBottom: "8px", borderBottom: `2px solid ${col.color}33` }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "11px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: col.color }}>
                    {col.label}
                  </span>
                  {items.length > 0 && (
                    <span style={{
                      marginLeft: "auto", minWidth: "18px", height: "18px",
                      background: col.color, color: "#04121c",
                      borderRadius: "999px", fontSize: "9px", fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 4px", fontFamily: "var(--font-space-grotesk)",
                    }}>
                      {items.length}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {items.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      colColor={col.color}
                      completing={completingId === task.id}
                      onComplete={() => handleComplete(task)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => handleDelete(task)}
                    />
                  ))}
                  {items.length === 0 && (
                    <div style={{
                      padding: "20px 10px", textAlign: "center",
                      border: `1px dashed ${col.color}22`, borderRadius: "var(--r-md)",
                      color: "var(--text-muted)", fontSize: "11px",
                    }}>
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: "var(--text-muted)", fontSize: "12px", fontWeight: 600,
              marginBottom: showCompleted ? "12px" : 0,
            }}
          >
            <span style={{ color: "#25d99a" }}>✓</span>
            Concluídas ({completedTasks.length})
            <span style={{ fontSize: "10px" }}>{showCompleted ? "▲" : "▼"}</span>
          </button>
          {showCompleted && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {completedTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  colColor="#25d99a"
                  done
                  completing={completingId === task.id}
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
        <div className="card" style={{ padding: "48px", textAlign: "center", marginTop: "24px" }}>
          <p style={{ fontSize: "36px", marginBottom: "12px" }}>📅</p>
          <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", fontFamily: "var(--font-space-grotesk)" }}>
            Agenda vazia
          </p>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
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
              {/* Emoji + Nome */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0 }}>
                  <label style={labelStyle}>Emoji</label>
                  <EmojiPicker value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e }))} />
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
                  <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ width: "110px" }}>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={form.due_time} onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* Notificação */}
              <div style={{
                borderRadius: "10px", overflow: "hidden",
                border: `1px solid ${form.notify_enabled ? "rgba(0,240,192,.35)" : "var(--border)"}`,
                transition: "border-color .15s",
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const next = !form.notify_enabled;
                    setForm((f) => ({
                      ...f, notify_enabled: next,
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

                {form.notify_enabled && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 14px", background: "rgba(0,240,192,.04)", borderTop: "1px solid rgba(0,240,192,.15)" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Data do aviso</label>
                        <input type="date" value={form.notify_date} onChange={(e) => setForm((f) => ({ ...f, notify_date: e.target.value }))} style={inputStyle} />
                      </div>
                      <div style={{ width: "110px" }}>
                        <label style={labelStyle}>Hora do aviso</label>
                        <input type="time" value={form.notify_time} onChange={(e) => setForm((f) => ({ ...f, notify_time: e.target.value }))} style={inputStyle} />
                      </div>
                    </div>
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
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Repetir lembrete</p>
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
                          position: "absolute", top: "2px", left: form.notify_repeat ? "16px" : "2px",
                          width: "14px", height: "14px", borderRadius: "50%",
                          background: "white", transition: "left .15s",
                        }} />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Categoria */}
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

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={closeForm} style={{ ...btnStyle, flex: 1, background: "transparent", border: "1px solid rgba(120,150,180,.25)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.due_date}
                style={{ ...btnStyle, flex: 2, background: "var(--accent-violet)", border: "none", color: "#04121c", opacity: (saving || !form.name.trim() || !form.due_date) ? 0.5 : 1 }}
              >
                {saving ? "Salvando..." : editingTask ? "Salvar" : "Criar tarefa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  task, colColor, done, completing, onComplete, onEdit, onDelete,
}: {
  task: ScheduledTask;
  colColor: string;
  done?: boolean;
  completing: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const catColor = getCategoryColor();

  return (
    <div
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--r-md)", padding: "10px 12px",
        borderTop: `3px solid ${done ? "#25d99a" : colColor}`,
        opacity: done ? 0.55 : 1,
        transition: "opacity .2s",
      }}
    >
      {/* Name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
        {task.emoji && <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{task.emoji}</span>}
        <span style={{
          fontWeight: 700, fontSize: "13px", color: "var(--text-primary)",
          textDecoration: done ? "line-through" : "none", lineHeight: 1.3, flex: 1,
        }}>
          {task.name}
        </span>
      </div>

      {/* Date */}
      <div style={{ fontSize: "10.5px", color: done ? "var(--text-muted)" : colColor, marginTop: "5px", fontWeight: 500 }}>
        📅 {formatDueDate(task)}
      </div>

      {/* Category chip */}
      {task.category && (
        <span style={{
          display: "inline-block", marginTop: "5px",
          fontSize: "9.5px", padding: "1px 6px", borderRadius: "4px", fontWeight: 600,
          background: `${catColor}22`, color: catColor, letterSpacing: ".06em",
          textTransform: "uppercase", fontFamily: "var(--font-space-grotesk)",
        }}>
          {task.category}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
        {!done && (
          <button
            onClick={onEdit}
            style={{
              flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
              background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            ✏️
          </button>
        )}
        <button
          onClick={onComplete}
          disabled={completing}
          style={{
            flex: 2, padding: "4px 0", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
            background: done ? "rgba(37,217,154,.12)" : `${colColor}18`,
            border: `1px solid ${done ? "rgba(37,217,154,.35)" : `${colColor}44`}`,
            color: done ? "#25d99a" : colColor,
            cursor: "pointer",
          }}
        >
          {completing ? "…" : done ? "Desfazer" : "✓ Concluir"}
        </button>
        <button
          onClick={onDelete}
          style={{
            width: "28px", borderRadius: "6px", fontSize: "11px",
            background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)",
            cursor: "pointer", opacity: 0.7,
          }}
        >
          ✕
        </button>
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
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={i} type="button" onClick={() => setTab(i)}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "4px", padding: "10px" }}>
            {EMOJI_GROUPS[tab].emojis.map((e) => (
              <button
                key={e} type="button"
                onClick={() => { onChange(e); setOpen(false); }}
                style={{
                  fontSize: "22px", padding: "6px", borderRadius: "8px", border: "none",
                  background: value === e ? "rgba(0,184,232,.15)" : "transparent",
                  cursor: "pointer", transition: "background .12s",
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <div style={{ padding: "0 10px 10px", borderTop: "1px solid var(--border)" }}>
            <input
              type="text" value={value} onChange={(e) => onChange(e.target.value)}
              placeholder="Ou cole qualquer emoji" maxLength={2}
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
  transition: "opacity .15s",
};
