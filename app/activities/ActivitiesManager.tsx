"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Activity } from "@/lib/db";
import { ActivityForm } from "@/components/ActivityForm";

const FREQ_LABEL: Record<string, string> = {
  daily: "Diário",
  weekly: "Semanal",
  free: "Livre",
};

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
        <div className="space-y-2">
          {active.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              onEdit={() => setFormMode({ kind: "edit", activity: a })}
              onArchive={() => handleArchive(a.id)}
            />
          ))}
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
                  activity={a}
                  archived
                  onUnarchive={() => handleUnarchive(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ActivityRowProps {
  activity: Activity;
  archived?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}

function ActivityRow({ activity: a, archived, onEdit, onArchive, onUnarchive }: ActivityRowProps) {
  const [confirming, setConfirming] = useState(false);

  function requestArchive() {
    if (confirming) {
      onArchive?.();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
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
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {FREQ_LABEL[a.frequency]} · +{a.xp_base} XP
        </p>
      </div>

      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: archived ? "#4b5563" : a.color }}
      />

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {archived ? (
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
