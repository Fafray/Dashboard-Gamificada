"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Activity } from "@/lib/db";
import { ActivityForm } from "@/components/ActivityForm";

const CATEGORIA_LABELS: Record<string, string> = {
  saude: "Saúde", treino: "Treino", estudo: "Estudo", disciplina: "Disciplina", foco: "Foco",
};

const CATEGORIA_COR: Record<string, string> = {
  saude:      "#25d99a",
  treino:     "#f0556a",
  estudo:     "#45cdf0",
  disciplina: "#ffce47",
  foco:       "#8b5cf6",
};

const CATEGORIAS_ORDEM = ["saude", "treino", "estudo", "disciplina", "foco"] as const;
const SEM_CATEGORIA = "__sem_categoria__";

function enrich(a: Activity) {
  const freqLabel =
    a.frequency === "nx_week" ? `${a.weekly_target}x/sem.` :
    a.frequency === "daily"   ? "Diária"      :
    a.frequency === "weekly"  ? "Semanal"     :
    a.frequency === "once"    ? "Missão única" : "Livre";
  return { ...a, freqLabel };
}

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
  const [filtro, setFiltro] = useState<string>("todas");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const res = await fetch("/api/activities?include_archived=true");
    const all: Activity[] = await res.json();
    setActive(all.filter((a) => !a.archived));
    setArchived(all.filter((a) => a.archived));
  }, []);

  async function handleSave(values: {
    name: string; frequency: string; emoji: string; color: string;
    weekly_target?: number; target_value?: number | null; target_unit?: string;
    categoria?: string | null; scheduled_days?: string; notify_at?: string;
  }) {
    if (formMode?.kind === "edit") {
      await fetch(`/api/activities/${formMode.activity.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
    } else {
      await fetch("/api/activities", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
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
      method: "PATCH", headers: { "Content-Type": "application/json" },
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

  const enriched = active.map(enrich);

  // Filter tabs
  const filtered = filtro === "todas"
    ? enriched
    : enriched.filter((a) => (a.categoria ?? SEM_CATEGORIA) === filtro);

  // Group by category
  const grupos: { key: string; label: string; cor: string; items: ReturnType<typeof enrich>[] }[] = [];

  // Ordered categories present in filtered list
  const catKeys = [
    ...CATEGORIAS_ORDEM.filter((c) => filtered.some((a) => a.categoria === c)),
    ...(filtered.some((a) => !a.categoria) ? [SEM_CATEGORIA] : []),
  ];

  for (const cat of catKeys) {
    const items = filtered.filter((a) => (a.categoria ?? SEM_CATEGORIA) === cat);
    if (items.length === 0) continue;
    grupos.push({
      key: cat,
      label: cat === SEM_CATEGORIA ? "Sem categoria" : (CATEGORIA_LABELS[cat] ?? cat),
      cor: CATEGORIA_COR[cat] ?? "var(--accent-violet)",
      items,
    });
  }

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const catTabs = [
    { key: "todas", label: "Todas" },
    ...CATEGORIAS_ORDEM
      .filter((c) => enriched.some((a) => a.categoria === c))
      .map((c) => ({ key: c, label: CATEGORIA_LABELS[c] ?? c })),
  ];

  return (
    <div className="page">
      {formMode && (
        <ActivityForm
          activity={formMode.kind === "edit" ? formMode.activity : undefined}
          onSave={handleSave}
          onCancel={() => setFormMode(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Hábitos
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
            {active.length} ativo{active.length !== 1 ? "s" : ""}
            {archived.length > 0 && ` · ${archived.length} arquivado${archived.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setFormMode({ kind: "create" })}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 16px", borderRadius: "10px", fontSize: "12.5px", fontWeight: 700,
            background: "var(--accent-violet)", color: "#04121c",
            border: "none", cursor: "pointer",
            fontFamily: "var(--font-space-grotesk), sans-serif",
          }}
        >
          + Novo hábito
        </button>
      </div>

      {/* Filter tabs */}
      {active.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
          {catTabs.map((tab) => {
            const isActive = filtro === tab.key;
            const cor = tab.key !== "todas" ? CATEGORIA_COR[tab.key] : "var(--accent-violet)";
            return (
              <button
                key={tab.key}
                onClick={() => setFiltro(tab.key)}
                style={{
                  padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                  cursor: "pointer", transition: "all .15s",
                  background: isActive ? cor : `${cor}18`,
                  border: `1px solid ${isActive ? cor : `${cor}44`}`,
                  color: isActive ? "#04121c" : cor,
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)", padding: "48px", textAlign: "center",
          }}
        >
          <p style={{ fontSize: "36px", marginBottom: "12px" }}>⚔️</p>
          <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", fontFamily: "var(--font-space-grotesk)" }}>
            Nenhum hábito ainda
          </p>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Crie seu primeiro hábito para começar
          </p>
          <button
            onClick={() => setFormMode({ kind: "create" })}
            style={{
              padding: "9px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
              background: "var(--accent-violet)", color: "#04121c", border: "none", cursor: "pointer",
            }}
          >
            Criar hábito
          </button>
        </div>
      ) : grupos.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
          Nenhum hábito nesta categoria
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {grupos.map((g) => (
            <div key={g.key}>
              {/* Group header */}
              <button
                onClick={() => toggleCollapse(g.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  padding: "0 0 12px", textAlign: "left",
                }}
              >
                <div style={{ width: "3px", height: "18px", borderRadius: "2px", background: g.cor, flexShrink: 0 }} />
                <span style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: "13px", fontWeight: 700,
                  letterSpacing: ".08em", textTransform: "uppercase", color: g.cor,
                }}>
                  {g.label}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "2px" }}>
                  {g.items.length}
                </span>
                <span style={{
                  marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)",
                  transform: collapsed[g.key] ? "rotate(0)" : "rotate(90deg)",
                  display: "inline-block", transition: "transform .2s",
                }}>
                  ▶
                </span>
              </button>

              {!collapsed[g.key] && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "12px",
                }}>
                  {g.items.map((a) => (
                    <MissionCard
                      key={a.id}
                      activity={a}
                      cor={g.cor}
                      onEdit={() => setFormMode({ kind: "edit", activity: a })}
                      onArchive={() => handleArchive(a.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div style={{ marginTop: "36px" }}>
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: "13px", fontWeight: 500, padding: 0,
              marginBottom: showArchived ? "12px" : 0,
            }}
          >
            <span style={{ transform: showArchived ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform .2s" }}>▶</span>
            Arquivadas ({archived.length})
          </button>

          {showArchived && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              {archived.map((a) => (
                <ArchivedRow
                  key={a.id}
                  activity={enrich(a)}
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

// ─── Mission Card ─────────────────────────────────────────────────────────────

type EnrichedActivity = Activity & { attr?: string | null; freqLabel?: string };

function MissionCard({
  activity: a, cor, onEdit, onArchive,
}: {
  activity: EnrichedActivity;
  cor: string;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  function requestArchive() {
    if (confirming) { onArchive(); setConfirming(false); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 3000); }
  }

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: "14px",
      display: "flex", flexDirection: "column", gap: "10px",
      position: "relative",
      boxShadow: "var(--shadow-card)",
    }}>
      {/* Archive icon — top-right */}
      <button
        onClick={requestArchive}
        title={confirming ? "Confirmar arquivamento?" : "Arquivar hábito"}
        style={{
          position: "absolute", top: "10px", right: "10px",
          width: "24px", height: "24px", borderRadius: "6px",
          background: confirming ? "rgba(240,85,106,.15)" : "transparent",
          border: confirming ? "1px solid rgba(240,85,106,.4)" : "1px solid transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", color: confirming ? "#f0556a" : "var(--text-muted)",
          transition: "all .15s",
        }}
      >
        🗄️
      </button>

      {/* Emoji box */}
      <div style={{
        width: "44px", height: "44px", borderRadius: "10px",
        background: `${cor}22`, border: `1px solid ${cor}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px",
      }}>
        {a.emoji ?? "⚡"}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 700, fontSize: "14px", color: "var(--text-primary)",
          lineHeight: 1.3, paddingRight: "20px",
        }}>
          {a.name}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
          {a.freqLabel}
          {a.target_value ? ` · meta ${a.target_value}${a.target_unit ?? ""}` : ""}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        style={{
          width: "100%", padding: "7px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 700,
          background: `${cor}18`, border: `1px solid ${cor}44`, color: cor,
          cursor: "pointer", fontFamily: "var(--font-space-grotesk), sans-serif",
          letterSpacing: ".06em", transition: "all .15s",
        }}
      >
        Editar
      </button>
    </div>
  );
}

// ─── Archived Row ─────────────────────────────────────────────────────────────

function ArchivedRow({
  activity: a, onUnarchive, onDelete,
}: {
  activity: EnrichedActivity;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function requestDelete() {
    if (confirmingDelete) { onDelete(); setConfirmingDelete(false); }
    else { setConfirmingDelete(true); setTimeout(() => setConfirmingDelete(false), 3000); }
  }

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: "10px 14px",
      display: "flex", alignItems: "center", gap: "10px", opacity: 0.6,
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
        background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "16px", filter: "grayscale(1)",
      }}>
        {a.emoji ?? "⚡"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.name}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
          {a.freqLabel}
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button
          onClick={onUnarchive}
          style={{
            padding: "5px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600,
            background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          Restaurar
        </button>
        <button
          onClick={requestDelete}
          style={{
            padding: "5px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600,
            cursor: "pointer", transition: "all .15s",
            ...(confirmingDelete
              ? { background: "rgba(240,85,106,.15)", border: "1px solid rgba(240,85,106,.5)", color: "#f0556a" }
              : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }),
          }}
        >
          {confirmingDelete ? "Confirmar?" : "Excluir"}
        </button>
      </div>
    </div>
  );
}
