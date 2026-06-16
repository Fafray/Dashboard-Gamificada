import { NextResponse } from "next/server";
import { getPushSubscriptions, getAgendaTasksForNotification, getNotifyDiagnostics } from "@/lib/db";

function localISO(offsetHours: number): string {
  const now = new Date();
  const localMs = now.getTime() + offsetHours * 3600000;
  return new Date(localMs).toISOString().replace("Z", "");
}

export async function GET() {
  const localOffset = parseInt(process.env.TZ_OFFSET_HOURS || "-3");
  const nowLocalISO = localISO(localOffset);

  const [agendaTasks, diag] = await Promise.all([
    getAgendaTasksForNotification(nowLocalISO),
    getNotifyDiagnostics(),
  ]);

  return NextResponse.json({
    server_utc: new Date().toISOString(),
    server_local: nowLocalISO,
    tz_offset: localOffset,
    subscriptions_count: diag.subscriptions_count,
    tasks_matching_now: agendaTasks.map((t) => ({ id: t.id, name: t.name, notify_date: t.notify_date, notify_time: t.notify_time })),
    all_notify_tasks: diag.notify_tasks,
  });
}
