"use client";

import { useState, useRef, useEffect } from "react";
import type { Activity } from "@/lib/db";

const CATEGORIA_COR: Record<string, string> = {
  saude:      "#7f9d72",
  treino:     "#b96a5c",
  estudo:     "#7c8ba3",
  disciplina: "#b8925a",
  foco:       "#8f7c96",
};

const FREQ_OPTIONS = [
  { value: "daily",   label: "Diário",      desc: "Todo dia" },
  { value: "weekly",  label: "Semanal",     desc: "1x por semana" },
  { value: "nx_week", label: "Nx/semana",   desc: "Ex: 3x/semana" },
  { value: "free",    label: "Livre",       desc: "Sem frequência" },
  { value: "once",    label: "Missão única", desc: "Fazer uma vez, tem prazo" },
] as const;

const UNIT_OPTIONS = ["L", "h", "min", "km", "páginas", "vezes", "ml"];

const EMOJI_GROUPS = [
  { label: "Saúde", emojis: ["💧", "🥗", "🥦", "🍎", "😴", "🛌", "🧘", "❤️", "🩺", "💊"] },
  { label: "Treino", emojis: ["🏋️", "🚴", "🏃", "🤸", "🧗", "🏊", "⚽", "🥊", "🎯", "💪"] },
  { label: "Estudo", emojis: ["📚", "📖", "✏️", "🧠", "💻", "🎓", "📝", "🔬", "🎵", "🌐"] },
  { label: "Disciplina", emojis: ["⏰", "📅", "✅", "🗓️", "⚡", "🔥", "🌅", "🌙", "🎯", "🏆"] },
  { label: "Foco", emojis: ["🧘", "🎯", "🔮", "🌿", "🕯️", "📿", "🦋", "🌊", "⚓", "🧩"] },
];

const CATEGORIA_OPTIONS = [
  { value: "saude",      label: "Saúde",      emoji: "❤️" },
  { value: "treino",     label: "Treino",      emoji: "💪" },
  { value: "estudo",     label: "Estudo",      emoji: "📚" },
  { value: "disciplina", label: "Disciplina",  emoji: "⚡" },
  { value: "foco",       label: "Foco",        emoji: "🎯" },
] as const;

const DAYS = [
  { label: "Dom", value: 0 },
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sáb", value: 6 },
];

interface FormValues {
  name: string;
  frequency: "daily" | "weekly" | "free" | "nx_week" | "once";
  emoji: string;
  color: string;
  weekly_target: number;
  target_value: number | null;
  target_unit: string;
  categoria: string | null;
  scheduled_days: string;
  notify_at: string;
  due_date: string;
}

interface ActivityFormProps {
  activity?: Activity;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

const fieldStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
};

export function ActivityForm({ activity, onSave, onCancel }: ActivityFormProps) {
  const [values, setValues] = useState<FormValues>({
    name:           activity?.name ?? "",
    frequency:      (activity?.frequency as FormValues["frequency"]) ?? "daily",
    emoji:          activity?.emoji ?? "",
    color:          activity?.color ?? "#c9903f",
    weekly_target:  activity?.weekly_target ?? 3,
    target_value:   activity?.target_value ?? null,
    target_unit:    activity?.target_unit ?? "L",
    categoria:      activity?.categoria ?? null,
    scheduled_days: activity?.scheduled_days ?? "",
    notify_at:      activity?.notify_at ?? "",
    due_date:       activity?.due_date ?? "",
  });
  const [hasTarget, setHasTarget] = useState(!!activity?.target_value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!values.name.trim()) { setError("Nome é obrigatório"); return; }
    if (values.frequency === "once" && !values.due_date) { setError("Prazo é obrigatório para missão única"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...values,
        target_value: hasTarget && values.target_value ? values.target_value : null,
        target_unit:  hasTarget ? values.target_unit : "",
        categoria:    values.categoria ?? null,
      });
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const cardColor = values.categoria ? (CATEGORIA_COR[values.categoria] ?? "var(--accent-violet)") : "var(--accent-violet)";

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full rounded-2xl p-6 space-y-5 overflow-y-auto"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          maxWidth: "440px",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            {activity ? "Editar hábito" : "Novo hábito"}
          </h2>
          <button onClick={onCancel} style={{ color: "var(--text-muted)", fontSize: "22px", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Nome
            </label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Academia, Água, Fisioterapia..."
              className={inputClass}
              style={fieldStyle}
              autoFocus
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Frequência
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FREQ_OPTIONS.map((opt) => {
                const active = values.frequency === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("frequency", opt.value)}
                    className="py-2.5 rounded-lg text-sm font-medium transition-all text-left px-3"
                    style={active
                      ? { background: cardColor + "25", border: `1px solid ${cardColor}`, color: cardColor }
                      : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                    }
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div style={{ fontSize: "11px", opacity: 0.65 }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Nx/week target */}
            {values.frequency === "nx_week" && (
              <div
                className="flex items-center gap-3 mt-3 p-3 rounded-xl"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", flexShrink: 0 }}>
                  Quantas vezes por semana?
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => set("weekly_target", Math.max(1, values.weekly_target - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >−</button>
                  <span
                    className="w-10 text-center font-bold text-lg"
                    style={{ color: "var(--accent-violet)", fontFamily: "var(--font-space-grotesk)" }}
                  >
                    {values.weekly_target}
                  </span>
                  <button
                    type="button"
                    onClick={() => set("weekly_target", Math.min(7, values.weekly_target + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >+</button>
                </div>
              </div>
            )}

            {/* Prazo para missão única */}
            {values.frequency === "once" && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Prazo
                </p>
                <input
                  type="date"
                  value={values.due_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("due_date", e.target.value)}
                  className={inputClass}
                  style={{ ...fieldStyle, maxWidth: "200px" }}
                />
                {!values.due_date && (
                  <p style={{ fontSize: "10.5px", color: "#ef4444", marginTop: "6px" }}>
                    Obrigatório para missão única
                  </p>
                )}
              </div>
            )}

            {/* Seletor de dias específicos */}
            {(values.frequency === "weekly" || values.frequency === "nx_week") && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Dias específicos <span style={{ opacity: 0.6 }}>— aparece só nesses dias no painel</span>
                </p>
                <div style={{ display: "flex", gap: "5px" }}>
                  {DAYS.map((d) => {
                    const selected = values.scheduled_days
                      ? values.scheduled_days.split(",").map(Number).includes(d.value)
                      : false;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          const current = values.scheduled_days
                            ? values.scheduled_days.split(",").map(Number)
                            : [];
                          const next = selected
                            ? current.filter((x) => x !== d.value)
                            : [...current, d.value].sort((a, b) => a - b);
                          set("scheduled_days", next.join(","));
                        }}
                        style={{
                          flex: 1, padding: "6px 0", borderRadius: "8px", fontSize: "11px",
                          fontWeight: selected ? 700 : 500, cursor: "pointer",
                          border: `1px solid ${selected ? cardColor : "var(--border)"}`,
                          background: selected ? `${cardColor}22` : "transparent",
                          color: selected ? cardColor : "var(--text-muted)",
                          transition: "all .12s",
                          fontFamily: "var(--font-space-grotesk), sans-serif",
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {!values.scheduled_days && (
                  <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "6px" }}>
                    Nenhum selecionado = aparece todos os dias
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Categoria <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— só organiza</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => set("categoria", null)}
                className="py-2 rounded-lg text-xs font-medium transition-all"
                style={!values.categoria
                  ? { background: "rgba(0,168,232,.15)", border: "1px solid rgba(0,168,232,.4)", color: "var(--accent-violet-bright)" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                }
              >
                Nenhuma
              </button>
              {CATEGORIA_OPTIONS.map((opt) => {
                const active = values.categoria === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("categoria", opt.value)}
                    className="py-2 rounded-lg text-xs font-medium transition-all"
                    style={active
                      ? { background: "rgba(0,168,232,.15)", border: "1px solid rgba(0,168,232,.4)", color: "var(--accent-violet-bright)" }
                      : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                    }
                  >
                    {opt.emoji} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meta diária (opcional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Meta diária
              </label>
              <button
                type="button"
                onClick={() => setHasTarget((v) => !v)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={hasTarget
                  ? { background: "rgba(34,211,238,.15)", border: "1px solid rgba(34,211,238,.4)", color: "var(--accent-teal)" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                }
              >
                {hasTarget ? "✓ ativo" : "+ ativar"}
              </button>
            </div>

            {hasTarget && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: "var(--bg-surface)", border: "1px solid rgba(34,211,238,.3)" }}
              >
                <span style={{ fontSize: "18px" }}>🎯</span>
                <input
                  type="number"
                  value={values.target_value ?? ""}
                  onChange={(e) => set("target_value", parseFloat(e.target.value) || null)}
                  placeholder="Ex: 2"
                  min={0}
                  step={0.1}
                  className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none text-center font-bold"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--accent-teal)",
                    fontFamily: "var(--font-space-grotesk)",
                    maxWidth: "80px",
                  }}
                />
                <select
                  value={values.target_unit}
                  onChange={(e) => set("target_unit", e.target.value)}
                  className="px-2 py-1.5 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0 }}>
                  por dia
                </span>
              </div>
            )}

            {!hasTarget && (
              <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Opcional — para hábitos como água (2L), sono (8h), leitura (30 min)
              </p>
            )}
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Emoji
            </label>
            <EmojiPicker value={values.emoji} onChange={(e) => set("emoji", e)} />
          </div>

          {/* Lembrete */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              🔔 Lembrete
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="time"
                value={values.notify_at}
                onChange={(e) => set("notify_at", e.target.value)}
                className={inputClass}
                style={{ ...fieldStyle, width: "130px", flex: "none" }}
              />
              {values.notify_at && (
                <button
                  type="button"
                  onClick={() => set("notify_at", "")}
                  style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Remover
                </button>
              )}
              {!values.notify_at && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Sem lembrete — opcional
                </span>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "var(--bg-surface)", border: `1px solid ${cardColor}40` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: cardColor + "20", border: `1px solid ${cardColor}40` }}>
              {values.emoji || "•"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                {values.name || "Nome do hábito"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {values.frequency === "nx_week"
                  ? `${values.weekly_target}x/semana`
                  : values.frequency === "once" && values.due_date
                  ? `Missão única · prazo ${values.due_date}`
                  : FREQ_OPTIONS.find(f => f.value === values.frequency)?.label}
                {hasTarget && values.target_value
                  ? ` · meta ${values.target_value}${values.target_unit}`
                  : ""}
              </p>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: saving ? cardColor + "60" : cardColor, color: "white" }}>
              {saving ? "Salvando..." : activity ? "Salvar" : "Criar hábito"}
            </button>
          </div>
        </form>
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
        className="w-full py-2.5 rounded-lg text-xl text-center transition"
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${open ? "rgba(0,184,232,.5)" : "var(--border)"}`,
          color: "var(--text-primary)",
          minHeight: "42px",
        }}
      >
        {value || "➕"}
      </button>

      {open && (
        <div style={{
          position: "absolute", zIndex: 100, top: "calc(100% + 6px)", left: 0,
          width: "260px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          borderRadius: "12px",
          boxShadow: "0 12px 40px rgba(0,0,0,.6)",
          overflow: "hidden",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTab(i)}
                style={{
                  flex: "1 0 auto",
                  padding: "8px 6px",
                  fontSize: "10px",
                  fontWeight: tab === i ? 700 : 400,
                  color: tab === i ? "var(--accent-teal)" : "var(--text-muted)",
                  background: tab === i ? "rgba(0,184,232,.08)" : "transparent",
                  border: "none",
                  borderBottom: tab === i ? "2px solid var(--accent-teal)" : "2px solid transparent",
                  cursor: "pointer",
                  letterSpacing: ".04em",
                  whiteSpace: "nowrap",
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
                  fontSize: "22px", padding: "6px",
                  borderRadius: "8px", border: "none",
                  background: value === e ? "rgba(0,184,232,.15)" : "transparent",
                  cursor: "pointer",
                  transition: "background .12s",
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
                borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px",
                outline: "none",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
