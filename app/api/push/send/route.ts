import { NextResponse } from "next/server";
import webpush from "web-push";
import { getPushSubscriptions, getActivitiesWithNotifyAt, getAgendaTasksForNotification } from "@/lib/db";

export async function POST(req: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:daily-quest@app.com",
    process.env.VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );
  // Aceita chamada manual com payload específico OU disparo automático por hora
  const body = await req.json().catch(() => ({}));

  // Verificação de segurança: cron secret
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const subscriptions = await getPushSubscriptions();
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, reason: "Sem assinantes" });
  }

  let notifications: { title: string; body: string; url: string; tag: string }[] = [];

  if (body.title) {
    // Chamada manual com payload explícito
    notifications = [{ title: body.title, body: body.body || "", url: body.url || "/", tag: body.tag || "manual" }];
  } else {
    // Disparo automático: verifica atividades com notify_at = hora atual
    const now = new Date();
    // Ajuste para fuso horário local (Railway usa UTC — user pode definir TZ)
    const localOffset = parseInt(process.env.TZ_OFFSET_HOURS || "-3");
    const localHour = (now.getUTCHours() + localOffset + 24) % 24;
    const localMin = now.getUTCMinutes();
    const timeStr = `${String(localHour).padStart(2, "0")}:${String(localMin).padStart(2, "0")}`;

    const localDateStr = `${String(now.getUTCFullYear())}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

    const [activities, agendaTasks] = await Promise.all([
      getActivitiesWithNotifyAt(timeStr),
      getAgendaTasksForNotification(timeStr, localDateStr),
    ]);

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

  return NextResponse.json({ sent, failed: failed.length });
}
