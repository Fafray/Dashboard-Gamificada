"use client";

import { useState } from "react";
import type { Activity } from "@/lib/db";

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#d97706", "#6b7280",
];

const FREQ_OPTIONS = [
  { value: "daily",   label: "Diário",  desc: "Todo dia" },
  { value: "weekly",  label: "Semanal", desc: "1x por semana" },
  { value: "free",    label: "Livre",   desc: "Sem frequência" },
] as const;

interface FormValues {
  name: string;
  frequency: "daily" | "weekly" | "free";
  xp_base: number;
  emoji: string;
  color: string;
}

interface ActivityFormProps {
  activity?: Activity;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function ActivityForm({ activity, onSave, onCancel }: ActivityFormProps) {
  const [values, setValues] = useState<FormValues>({
    name: activity?.name ?? "",
    frequency: (activity?.frequency as FormValues["frequency"]) ?? "daily",
    xp_base: activity?.xp_base ?? 10,
    emoji: activity?.emoji ?? "",
    color: activity?.color ?? "#7c3aed",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(values);
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            {activity ? "Editar atividade" : "Nova atividade"}
          </h2>
          <button
            onClick={onCancel}
            className="text-xl leading-none"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
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
              placeholder="Ex: Remédio, Água, Academia..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 transition"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              autoFocus
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Frequência
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FREQ_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("frequency", opt.value)}
                  className="py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={
                    values.frequency === opt.value
                      ? { background: values.color + "30", border: `1px solid ${values.color}`, color: values.color }
                      : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }
                >
                  <div>{opt.label}</div>
                  <div className="text-xs opacity-60">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Emoji + XP row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Emoji (opcional)
              </label>
              <input
                type="text"
                value={values.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                placeholder="💊"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition text-center text-xl"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                XP Base
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => set("xp_base", Math.max(1, values.xp_base - 5))}
                  className="w-9 h-10 rounded-lg text-lg font-bold flex-shrink-0"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  −
                </button>
                <input
                  type="number"
                  value={values.xp_base}
                  onChange={(e) => set("xp_base", Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-2 py-2.5 rounded-lg text-sm text-center outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  min={1}
                  max={500}
                />
                <button
                  type="button"
                  onClick={() => set("xp_base", Math.min(500, values.xp_base + 5))}
                  className="w-9 h-10 rounded-lg text-lg font-bold flex-shrink-0"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  +
                </button>
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
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className="w-full aspect-square rounded-lg transition-transform"
                  style={{
                    background: c,
                    transform: values.color === c ? "scale(1.15)" : "scale(1)",
                    outline: values.color === c ? `2px solid white` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ background: "var(--bg-surface)", border: `1px solid ${values.color}40` }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ background: values.color + "20", border: `1px solid ${values.color}40` }}
            >
              {values.emoji || "⚡"}
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                {values.name || "Nome da atividade"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {FREQ_OPTIONS.find(f => f.value === values.frequency)?.label} · +{values.xp_base} XP
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold"
              style={{
                background: saving ? values.color + "60" : values.color,
                color: "white",
              }}
            >
              {saving ? "Salvando..." : activity ? "Salvar alterações" : "Criar atividade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
