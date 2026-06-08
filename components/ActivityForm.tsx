"use client";

import { useState, useRef, useEffect } from "react";
import type { Activity } from "@/lib/db";

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#d97706", "#6b7280",
];

const FREQ_OPTIONS = [
  { value: "daily",   label: "Diário",    desc: "Todo dia" },
  { value: "weekly",  label: "Semanal",   desc: "1x por semana" },
  { value: "nx_week", label: "Nx/semana", desc: "Ex: 3x/semana" },
  { value: "free",    label: "Livre",     desc: "Sem frequência" },
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
  { value: "saude",      label: "Saúde",      attr: "VIT", emoji: "❤️" },
  { value: "treino",     label: "Treino",      attr: "FOR", emoji: "💪" },
  { value: "estudo",     label: "Estudo",      attr: "INT", emoji: "📚" },
  { value: "disciplina", label: "Disciplina",  attr: "AGI", emoji: "⚡" },
  { value: "foco",       label: "Foco",        attr: "PER", emoji: "🎯" },
] as const;

interface FormValues {
  name: string;
  frequency: "daily" | "weekly" | "free" | "nx_week";
  xp_base: number;
  emoji: string;
  color: string;
  weekly_target: number;
  target_value: number | null;
  target_unit: string;
  categoria: string | null;
  micro_version: string;
  anchor_context: string;
  is_keystone: boolean;
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
    xp_base:        activity?.xp_base ?? 10,
    emoji:          activity?.emoji ?? "",
    color:          activity?.color ?? "#7c3aed",
    weekly_target:  activity?.weekly_target ?? 3,
    target_value:   activity?.target_value ?? null,
    target_unit:    activity?.target_unit ?? "L",
    categoria:      activity?.categoria ?? null,
    micro_version:  (activity as Activity & { micro_version?: string })?.micro_version ?? "",
    anchor_context: (activity as Activity & { anchor_context?: string })?.anchor_context ?? "",
    is_keystone:    (activity as Activity & { is_keystone?: boolean })?.is_keystone ?? false,
  });
  const [hasTarget, setHasTarget] = useState(!!activity?.target_value);
  const [hasMicro, setHasMicro] = useState(!!(activity as Activity & { micro_version?: string })?.micro_version);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!values.name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...values,
        target_value:   hasTarget && values.target_value ? values.target_value : null,
        target_unit:    hasTarget ? values.target_unit : "",
        categoria:      values.categoria ?? null,
        micro_version:  hasMicro ? values.micro_version : "",
        anchor_context: hasMicro ? values.anchor_context : "",
        is_keystone:    hasMicro ? values.is_keystone : false,
      });
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

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
          boxShadow: "0 0 60px rgba(124,92,255,.2), 0 24px 48px -16px rgba(0,0,0,.8)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            {activity ? "Editar atividade" : "Nova atividade"}
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
                      ? { background: values.color + "25", border: `1px solid ${values.color}`, color: values.color }
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
          </div>

          {/* Categoria / Atributo */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Categoria <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— amplifica atributo</span>
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
                    <div style={{ fontSize: "10px", opacity: .6, marginTop: "1px" }}>+{opt.attr}</div>
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

          {/* Micro-hábito */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Versão mínima
              </label>
              <button
                type="button"
                onClick={() => setHasMicro((v) => !v)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={hasMicro
                  ? { background: "rgba(34,211,238,.15)", border: "1px solid rgba(34,211,238,.4)", color: "var(--accent-teal)" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                }
              >
                {hasMicro ? "✓ ativo" : "+ ativar"}
              </button>
            </div>

            {hasMicro && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={values.micro_version}
                  onChange={(e) => set("micro_version", e.target.value)}
                  placeholder='Ex: "Colocar o tênis", "Abrir o livro"'
                  className={inputClass}
                  style={fieldStyle}
                />
                <input
                  type="text"
                  value={values.anchor_context}
                  onChange={(e) => set("anchor_context", e.target.value)}
                  placeholder='Faço isso depois de... (opcional)'
                  className={inputClass}
                  style={{ ...fieldStyle, fontSize: "12px" }}
                />
                <label
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ background: "var(--bg-surface)", border: `1px solid ${values.is_keystone ? "rgba(239,165,39,.4)" : "var(--border)"}` }}
                >
                  <input
                    type="checkbox"
                    checked={values.is_keystone}
                    onChange={(e) => set("is_keystone", e.target.checked)}
                    style={{ accentColor: "#efa527", width: "16px", height: "16px" }}
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: values.is_keystone ? "#efa527" : "var(--text-secondary)" }}>
                      ⚓ Hábito-âncora
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Completo → +10% XP em todas as outras missões do dia. Só 1 permitido.
                    </div>
                  </div>
                </label>
              </div>
            )}

            {!hasMicro && (
              <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Opcional — versão mínima inquebrável do hábito (BJ Fogg, Tiny Habits)
              </p>
            )}
          </div>

          {/* Emoji + XP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Emoji
              </label>
              <EmojiPicker value={values.emoji} onChange={(e) => set("emoji", e)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                XP Base
              </label>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => set("xp_base", Math.max(1, values.xp_base - 5))}
                  className="w-9 h-10 rounded-lg text-lg font-bold flex-shrink-0"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>−</button>
                <input
                  type="number"
                  value={values.xp_base}
                  onChange={(e) => set("xp_base", Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-2 py-2.5 rounded-lg text-sm text-center outline-none"
                  style={fieldStyle}
                  min={1} max={500}
                />
                <button type="button" onClick={() => set("xp_base", Math.min(500, values.xp_base + 5))}
                  className="w-9 h-10 rounded-lg text-lg font-bold flex-shrink-0"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>+</button>
              </div>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Cor
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => set("color", c)}
                  className="w-full aspect-square rounded-lg transition-transform"
                  style={{
                    background: c,
                    transform: values.color === c ? "scale(1.18)" : "scale(1)",
                    outline: values.color === c ? "2px solid white" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "var(--bg-surface)", border: `1px solid ${values.color}40` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: values.color + "20", border: `1px solid ${values.color}40` }}>
              {values.emoji || "⚡"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                {values.name || "Nome da atividade"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {values.frequency === "nx_week"
                  ? `${values.weekly_target}x/semana`
                  : FREQ_OPTIONS.find(f => f.value === values.frequency)?.label}
                {" · +"}
                {values.xp_base} XP
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
              style={{ background: saving ? values.color + "60" : values.color, color: "white" }}>
              {saving ? "Salvando..." : activity ? "Salvar" : "Criar atividade"}
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
