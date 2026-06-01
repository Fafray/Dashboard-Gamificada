import { format } from "date-fns";
import {
  getCheckinsGroupedByDate,
  getXpPerDay,
  getTotalCheckinsCount,
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
} from "@/lib/db";
import { getLevelInfo, computeStreak } from "@/lib/gamification";
import { Heatmap } from "@/components/Heatmap";
import { XPChart } from "@/components/XPChart";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [heatmapData, xpData, totalCheckins, rawStats, activities] = await Promise.all([
    getCheckinsGroupedByDate(365),
    getXpPerDay(30),
    getTotalCheckinsCount(),
    getUserStats(),
    getActivities(false),
  ]);

  const { level, totalXP } = getLevelInfo(rawStats.total_xp);

  // Best streak across all non-free activities
  let bestStreak = 0;
  for (const act of activities) {
    if (act.frequency === "free") continue;
    const dates = await getCheckinDatesForActivity(act.id);
    const { longest } = computeStreak(dates, act.frequency);
    bestStreak = Math.max(bestStreak, longest);
  }

  // Active days (days with at least 1 check-in)
  const activeDays = heatmapData.filter((d) => d.count > 0).length;

  // XP earned in last 30 days
  const xpLast30 = xpData.reduce((sum, d) => sum + d.xp, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Histórico
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Último ano de atividade
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Check-ins totais", value: totalCheckins },
          { label: "Dias ativos", value: activeDays },
          { label: "Maior streak", value: `${bestStreak}d` },
          { label: "XP últimos 30d", value: `+${xpLast30}` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {s.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
          Contribuições — último ano
        </h2>
        <Heatmap data={heatmapData} />
      </div>

      {/* XP Chart */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            XP por dia — últimos 30 dias
          </h2>
          <span className="text-sm font-bold" style={{ color: "var(--accent-gold)" }}>
            +{xpLast30} XP
          </span>
        </div>
        <XPChart data={xpData} />
      </div>
    </div>
  );
}
