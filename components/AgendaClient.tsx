"use client";

import { useState, useMemo } from "react";
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
  completed_at: string | null;
  created_at: string;
}

type Urgency = "overdue" | "today" | "tomorrow" | "week" | "later";

interface AgendaClientProps {
  initialTasks: ScheduledTask[];
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  pessoal:    { label: "Pessoal",    color: "#7c3aed" },
  saude:      { label: "Saúde",      color: "#10b981" },
  trabalho:   { label: "Trabalho",   color: "#3b82f6" },
  financeiro: { label: "Financeiro", color: "#f59e0b" },
};

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string; dimColor: string }> = {
  overdue:  { label: "Atrasadas",     color: "#ef4444", dimColor: "rgba(239,68,68,.1)" },
  today:    { label: "Hoje",          color: "#f59e0b", dimColor: "rgba(245,158,11,.1)" },
  tomorrow: { label: "Amanhã",        color: "#06b6d4", dimColor: "rgba(6,182,212,.1)" },
  week:     { label: "Esta Semana",   color: "#3b82f6", dimColor: "rgba(59,130,246,.1)" },
  later:    { label: "Mais Adiante",  color: "#94a3b8", dimColor: "rgba(148,163,184,.06)" },
};

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
        category: form.category || null,
        notes: form.notes.trim() || null,
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
          <div className="card" style={{ width: "100%", maxWidth: "480px", padding: "28px", position: "relative" }}>
            <p className="eyebrow" style={{ marginBottom: "20px" }}>
              {editingTask ? "[ EDITAR TAREFA ]" : "[ NOVA TAREFA ]"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Nome + Emoji */}
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  placeholder="📌"
                  style={{ ...inputStyle, width: "60px", textAlign: "center", fontSize: "20px" }}
                />
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome da tarefa"
                  style={{ ...inputStyle, flex: 1 }}
                  autoFocus
                />
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

              {/* Categoria */}
              <div>
                <label style={labelStyle}>Categoria</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[{ k: "", l: "Nenhuma" }, ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ k, l: v.label }))].map(({ k, l }) => (
                    <button
                      key={k}
                      onClick={() => setForm((f) => ({ ...f, category: k }))}
                      style={{
                        padding: "5px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 500,
                        cursor: "pointer", border: "1px solid",
                        borderColor: form.category === k
                          ? (k ? CATEGORY_CONFIG[k].color : "rgba(0,184,232,.45)")
                          : "rgba(120,150,180,.2)",
                        background: form.category === k
                          ? (k ? `${CATEGORY_CONFIG[k].color}22` : "rgba(0,184,232,.1)")
                          : "transparent",
                        color: form.category === k
                          ? (k ? CATEGORY_CONFIG[k].color : "var(--accent-teal)")
                          : "var(--text-muted)",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
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
  const catCfg = task.category ? CATEGORY_CONFIG[task.category] : null;

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
          {catCfg && (
            <span style={{
              fontSize: "10px", padding: "2px 7px", borderRadius: "5px", fontWeight: 600,
              background: `${catCfg.color}22`, color: catCfg.color, letterSpacing: ".07em",
              textTransform: "uppercase", fontFamily: "var(--font-space-grotesk), sans-serif",
            }}>
              {catCfg.label}
            </span>
          )}
        </div>
        <div style={{ fontSize: "11.5px", color: done ? "var(--text-muted)" : cfg.color, marginTop: "4px", fontWeight: 500 }}>
          📅 {formatDueDate(task)}
          {done && task.completed_at && (
            <span style={{ color: "#10b981", marginLeft: "10px" }}>
              ✓ concluída
            </span>
          )}
        </div>
        {task.notes && (
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>
            {task.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
        {!done && (
          <button onClick={onEdit} style={iconBtnStyle} title="Editar">
            ✏️
          </button>
        )}
        <button onClick={onDelete} style={{ ...iconBtnStyle, opacity: 0.6 }} title="Excluir">
          ✕
        </button>
      </div>
    </div>
  );
}

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
