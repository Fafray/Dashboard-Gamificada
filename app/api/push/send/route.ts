import { NextResponse } from "next/server";
import webpush from "web-push";
import { getPushSubscriptions, getActivitiesWithNotifyAt, getAgendaTasksForNotification, markAgendaTaskNotified, getPendingDailyRiskXP } from "@/lib/db";

function localISO(offsetHours: number): string {
  const now = new Date();
  const localMs = now.getTime() + offsetHours * 3600000;
  return new Date(localMs).toISOString().replace("Z", "").replace("T", "T");
}

export async function POST(req: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:daily-quest@app.com",
    process.env.VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );

  const body = await req.json().catch(() => ({}));

  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const subscriptions = await getPushSubscriptions();
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, reason: "Sem assinantes" });
  }

  let notifications: { title: string; body: string; url: string; tag: string }[] = [];
  let agendaTaskIds: number[] = [];

  if (body.title) {
    notifications = [{ title: body.title, body: body.body || "", url: body.url || "/", tag: body.tag || "manual" }];
  } else {
    const localOffset = parseInt(process.env.TZ_OFFSET_HOURS || "-3");
    const now = new Date();
    const localHour = (now.getUTCHours() + localOffset + 24) % 24;
    const localMin = now.getUTCMinutes();
    const timeStr = `${String(localHour).padStart(2, "0")}:${String(localMin).padStart(2, "0")}`;

    // ISO local para a query de janela de tempo da agenda
    const nowLocalISO = localISO(localOffset);

    const todayStr = nowLocalISO.slice(0, 10);

    const [activities, agendaTasks, riskXP] = await Promise.all([
      getActivitiesWithNotifyAt(timeStr),
      getAgendaTasksForNotification(nowLocalISO),
      localHour === 21 && localMin === 0 ? getPendingDailyRiskXP(todayStr) : Promise.resolve(null),
    ]);

    agendaTaskIds = agendaTasks.map((t) => t.id);

    notifications = [
      ...activities.map((a) => ({
        title: `${a.emoji ?? "⚡"} ${a.name}`,
        body: a.anchor_context ? a.anchor_context : "Hora de completar sua missão!",
        url: "/",
        tag: `activity-${a.id}`,
      })),
      ...agendaTasks.map((t) => ({
        title: `${t.emoji ?? "📌"} ${t.name}`,
        body: t.notes ? t.notes : `Compromisso às ${timeStr}`,
        url: "/agenda",
        tag: `agenda-${t.id}`,
      })),
      ...(riskXP && riskXP.count > 0 ? [{
        title: "⚠️ Missões pendentes",
        body: `${riskXP.count} missão${riskXP.count !== 1 ? "ões" : ""} sem completar · −${riskXP.xpAtRisk} XP em risco`,
        url: "/",
        tag: "xp-risk",
      }] : []),
    ];

    if (notifications.length === 0) {
      return NextResponse.json({ sent: 0, time: timeStr, reason: "Sem atividades nesse horário" });
    }
  }

  let sent = 0;
  const failed: string[] = [];

  for (const sub of subscriptions) {
    for (const notif of notifications) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(notif)
        );
        sent++;
      } catch {
        failed.push(sub.endpoint);
      }
    }
  }

  // Marca tarefas da agenda como notificadas para não reenviar
  if (sent > 0) {
    await Promise.all(agendaTaskIds.map((id) => markAgendaTaskNotified(id)));
  }

  return NextResponse.json({ sent, failed: failed.length });
}
