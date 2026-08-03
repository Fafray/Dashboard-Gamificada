import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import {
  getCheckinsGroupedByDate,
  getTotalCheckinsCount,
  getActivities,
  getCheckinDatesForActivity,
  getActivityStatsAll,
} from "@/lib/db";
import { computeStreak } from "@/lib/streaks";
import { Heatmap } from "@/components/Heatmap";
import { HabitoStatsPanel, type HabitoStatItem } from "@/components/HabitoStatsPanel";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const [heatmapData, totalCheckins, activities, actStats] = await Promise.all([
    getCheckinsGroupedByDate(365),
    getTotalCheckinsCount(),
    getActivities(false),
    getActivityStatsAll(),
  ]);

  const statsById = new Map(actStats.map((s) => [s.id, s]));
  const habitoItems: HabitoStatItem[] = [];
  let bestStreak = 0;

  for (const act of activities) {
    const dates = await getCheckinDatesForActivity(act.id);
    const { current, longest } = computeStreak(
      dates,
      act.frequency,
      new Date(),
      act.weekly_target ?? undefined
    );
    if (act.frequency !== "free" && act.frequency !== "once") {
      bestStreak = Math.max(bestStreak, longest);
    }
    const s = statsById.get(act.id);
    if (s) {
      habitoItems.push({
        id: act.id,
        name: act.name,
        emoji: act.emoji,
        color: act.color,
        frequency: act.frequency,
        total_checkins: s.total_checkins,
        last_checkin: s.last_checkin,
        current_streak: act.frequency === "free" || act.frequency === "once" ? 0 : current,
        best_streak: act.frequency === "free" || act.frequency === "once" ? 0 : longest,
      });
    }
  }

  const activeDays = heatmapData.filter((d) => d.count > 0).length;

  const stats = [
    { label: "Check-ins totais", value: totalCheckins,     color: "var(--accent-teal)" },
    { label: "Dias ativos",      value: activeDays,        color: "var(--accent-green)" },
    { label: "Maior streak",     value: `${bestStreak}d`,  color: "var(--accent-gold)" },
    { label: "Hábitos ativos",   value: activities.length, color: "var(--accent-violet-bright)" },
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: "8px" }}>
        <p className="eyebrow">Histórico</p>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>
          Sua constância
        </h1>
      </div>

      <div className="section">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          {stats.map((s) => (
            <div key={s.label} className="card" style={{ padding: "18px 16px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "24px", fontWeight: 700, color: s.color, lineHeight: 1 }}>
                {s.value}
              </p>
              <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Contribuições</h3>
              <p className="panel-help">Último ano de atividade</p>
            </div>
            <div className="heat-stats">
              <div className="hs"><b>{activeDays}</b><span>dias ativos</span></div>
            </div>
          </div>
          <Heatmap data={heatmapData} />
        </div>
      </div>

      <div className="section">
        <HabitoStatsPanel items={habitoItems} />
      </div>
    </div>
  );
}
