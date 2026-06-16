"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Activity } from "@/lib/db";
import { ActivityForm } from "@/components/ActivityForm";
import { MedidorEquilibrio } from "@/components/MedidorEquilibrio";
import { CATEGORIA_ATRIBUTO, CATEGORIA_LABELS } from "@/lib/attributes";

const COR_ATTR: Record<string, string> = {
  FOR: "#e24b4a",
  VIT: "#1d9e75",
  AGI: "#efa527",
  INT: "#9b8bff",
  PER: "#3b82f6",
};

function enrich(a: Activity) {
  const tipo =
    a.frequency === "daily" ? "diaria" :
    a.frequency === "free"  ? "livre"  : "semanal";
  const attr = a.categoria ? CATEGORIA_ATRIBUTO[a.categoria] ?? null : null;
  const dificuldade =
    a.xp_base <= 10 ? "Fácil" :
    a.xp_base <= 25 ? "Média" : "Difícil";
  const freqLabel =
    a.frequency === "nx_week" ? `${a.weekly_target}x/semana` :
    a.frequency === "daily"   ? "Diária"  :
    a.frequency === "weekly"  ? "Semanal" : "Livre";
  return { ...a, tipo, attr, dificuldade, freqLabel };
}

const GRUPOS = [
  { tipo: "diaria",  rotulo: "DIÁRIAS" },
  { tipo: "semanal", rotulo: "SEMANAIS" },
  { tipo: "livre",   rotulo: "LIVRES" },
] as const;

interface ActivitiesManagerProps {
  active: Activity[];
  archived: Activity[];
}

type FormMode = { kind: "create" } | { kind: "edit"; activity: Activity } | null;

export function ActivitiesManager({ active: initialActive, archived: initialArchived }: ActivitiesManagerProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [archived, setArchived] = useState(initialArchived);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [showArchived, setShowArchived] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/activities?include_archived=true");
    const all: Activity[] = await res.json();
    setActive(all.filter((a) => !a.archived));
    setArchived(all.filter((a) => a.archived));
  }, []);

  async function handleSave(values: {
    name: string;
    frequency: string;
    xp_base: number;
    emoji: string;
    color: string;
    weekly_target?: number;
    target_value?: number | null;
    target_unit?: string;
    categoria?: string | null;
    scheduled_days?: string;
  }) {
    if (formMode?.kind === "edit") {
      await fetch(`/api/activities/${formMode.activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } else {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    }
    setFormMode(null);
    await refresh();
    router.refresh();
  }

  async function handleArchive(id: number) {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    await refresh();
    router.refresh();
  }

  async function handleUnarchive(id: number) {
    await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: 0 }),
    });
    await refresh();
    router.refresh();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/activities/${id}?permanent=true`, { method: "DELETE" });
    await refresh();
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Modal */}
      {formMode && (
        <ActivityForm
          activity={formMode.kind === "edit" ? formMode.activity : undefined}
          onSave={handleSave}
          onCancel={() => setFormMode(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Atividades
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {active.length} ativa{active.length !== 1 ? "s" : ""}
            {archived.length > 0 && ` · ${archived.length} arquivada${archived.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setFormMode({ kind: "create" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{
            background: "var(--accent-violet)",
            color: "white",
            boxShadow: "0 0 16px rgba(124,58,237,0.4)",
          }}
        >
          + Nova
        </button>
      </div>

      {/* Medidor de equilíbrio */}
      {active.length > 0 && (
        <div>
          <MedidorEquilibrio atividades={active} />
        </div>
      )}

      {/* Active activities */}
      {active.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-3xl mb-3">⚔️</p>
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Nenhuma atividade ainda
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Crie sua primeira atividade para começar a ganhar XP
          </p>
          <button
            onClick={() => setFormMode({ kind: "create" })}
            className="px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: "var(--accent-violet)", color: "white" }}
          >
            Criar atividade
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {GRUPOS.map((g) => {
            const itens = active.map(enrich).filter((a) => a.tipo === g.tipo);
            if (itens.length === 0) return null;
            return (
              <div key={g.tipo}>
                <p
                  className="text-xs font-semibold tracking-widest mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {g.rotulo} · {itens.length}
                </p>
                <div className="space-y-2">
                  {itens.map((a) => (
                    <ActivityRow
                      key={a.id}
                      activity={a}
                      onEdit={() => setFormMode({ kind: "edit", activity: a })}
                      onArchive={() => handleArchive(a.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived section */}
      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            <span style={{ transform: showArchived ? "rotate(90deg)" : "rotate(0)", display: "inline-block", transition: "transform 0.2s" }}>
              ▶
            </span>
            Arquivadas ({archived.length})
          </button>

          {showArchived && (
            <div className="space-y-2">
              {archived.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={enrich(a)}
                  archived
                  onUnarchive={() => handleUnarchive(a.id)}
                  onDelete={() => handleDelete(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type EnrichedActivity = Activity & {
  tipo?: string;
  attr?: string | null;
  dificuldade?: string;
  freqLabel?: string;
};

interface ActivityRowProps {
  activity: EnrichedActivity;
  archived?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
}

function ActivityRow({ activity: a, archived, onEdit, onArchive, onUnarchive, onDelete }: ActivityRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function requestArchive() {
    if (confirming) {
      onArchive?.();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }

  function requestDelete() {
    if (confirmingDelete) {
      onDelete?.();
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 3000);
    }
  }

  return (
    <div
      className="activity-card rounded-xl px-4 py-3 flex items-center gap-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        opacity: archived ? 0.6 : 1,
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg text-xl flex-shrink-0"
        style={{
          background: a.color + "20",
          border: `1px solid ${a.color}40`,
          filter: archived ? "grayscale(1)" : "none",
        }}
      >
        {a.emoji || "⚡"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
          {a.name}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {a.categoria && a.attr && (
            <span
              className="text-xs rounded px-1.5 py-0.5 font-medium"
              style={{
                color: COR_ATTR[a.attr] ?? "var(--text-muted)",
                background: (COR_ATTR[a.attr] ?? "#888") + "18",
              }}
            >
              {CATEGORIA_LABELS[a.categoria] ?? a.categoria} · {a.attr}
            </span>
          )}
          <span className="text-xs rounded px-1.5 py-0.5" style={{ color: "var(--text-muted)", background: "var(--bg-surface)" }}>
            {a.freqLabel ?? a.frequency}
          </span>
          <span className="text-xs rounded px-1.5 py-0.5" style={{ color: "var(--text-muted)", background: "var(--bg-surface)" }}>
            {a.dificuldade ?? "Fácil"} · +{a.xp_base} XP
          </span>
        </div>
      </div>

      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: archived ? "#4b5563" : a.color }}
      />

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {archived ? (
          <>
            <button
              onClick={onUnarchive}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Desarquivar
            </button>
            <button
              onClick={requestDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={
                confirmingDelete
                  ? { background: "#ef444420", border: "1px solid #ef4444", color: "#ef4444" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
              }
              title={confirmingDelete ? "Clique novamente para excluir permanentemente" : "Excluir permanentemente"}
            >
              {confirmingDelete ? "Confirmar?" : "Excluir"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Editar
            </button>
            <button
              onClick={requestArchive}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={
                confirming
                  ? { background: "#ef444420", border: "1px solid #ef4444", color: "#ef4444" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
              }
              title={confirming ? "Clique novamente para confirmar" : "Arquivar atividade"}
            >
              {confirming ? "Confirmar?" : "Arquivar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
