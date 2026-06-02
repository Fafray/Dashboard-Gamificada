import {
  getCheckinsGroupedByDate,
  getXpPerDay,
  getTotalCheckinsCount,
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
  getEvents,
  getLevelHistory,
} from "@/lib/db";
import { computeStreak, getLevelInfo } from "@/lib/gamification";
import { Heatmap } from "@/components/Heatmap";
import { XPChart } from "@/components/XPChart";
import { EvolucaoNivel } from "@/components/EvolucaoNivel";
import { RegistroSistema } from "@/components/RegistroSistema";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [heatmapData, xpData, totalCheckins, rawStats, activities, eventos] = await Promise.all([
    getCheckinsGroupedByDate(365),
    getXpPerDay(30),
    getTotalCheckinsCount(),
    getUserStats(),
    getActivities(false),
    getEvents(60),
  ]);

  const { level: currentLevel } = getLevelInfo(rawStats.total_xp);
  const levelHistory = await getLevelHistory(currentLevel);


  let bestStreak = 0;
  for (const act of activities) {
    if (act.frequency === "free") continue;
    const dates = await getCheckinDatesForActivity(act.id);
    const { longest } = computeStreak(dates, act.frequency);
    bestStreak = Math.max(bestStreak, longest);
  }

  const activeDays = heatmapData.filter((d) => d.count > 0).length;
  const xpLast30 = xpData.reduce((sum, d) => sum + d.xp, 0);

  const stats = [
    { label: "Check-ins totais", value: totalCheckins, color: "var(--accent-teal)" },
    { label: "Dias ativos", value: activeDays, color: "var(--accent-green)" },
    { label: "Maior streak", value: `${bestStreak}d`, color: "var(--accent-gold)" },
    { label: "XP últimos 30d", value: `+${xpLast30}`, color: "var(--accent-violet-bright)" },
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: "8px" }}>
        <p className="eyebrow">Histórico</p>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>
          Sua constância
        </h1>
      </div>

      {/* Stats */}
      <div className="section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px",
          }}
        >
          {stats.map((s) => (
            <div key={s.label} className="card" style={{ padding: "18px 16px", textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "var(--font-space-grotesk)",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </p>
              <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="section">
        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Contribuições</h3>
              <p className="panel-help">Último ano de atividade</p>
            </div>
            <div className="heat-stats">
              <div className="hs">
                <b>{activeDays}</b>
                <span>dias ativos</span>
              </div>
            </div>
          </div>
          <Heatmap data={heatmapData} />
        </div>
      </div>

      {/* XP Chart */}
      <div className="section">
        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>XP por dia</h3>
              <p className="panel-help">Últimos 30 dias</p>
            </div>
            <div className="heat-stats">
              <div className="hs">
                <b>+{xpLast30}</b>
                <span>XP no período</span>
              </div>
            </div>
          </div>
          <XPChart data={xpData} />
        </div>
      </div>

      {/* Evolução de nível */}
      <div className="section">
        <EvolucaoNivel historico={levelHistory} />
      </div>

      {/* Registro do sistema */}
      <div className="section">
        <RegistroSistema eventos={eventos} />
      </div>
    </div>
  );
}
