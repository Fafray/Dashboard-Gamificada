import { NextRequest, NextResponse } from "next/server";
import { updateScheduledTask, deleteScheduledTask, getScheduledTask } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

function localISOString() {
  const d = new Date();
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const taskId = parseInt(id);
  const body = await req.json();

  if (body.action === "complete") {
    const task = await updateScheduledTask(taskId, { completed_at: localISOString() });
    return NextResponse.json({ task });
  }

  if (body.action === "uncomplete") {
    const task = await updateScheduledTask(taskId, { completed_at: null });
    return NextResponse.json({ task });
  }

  const { name, emoji, due_date, due_time, category, notes, notify_enabled, notify_date, notify_time, notify_repeat } = body;
  const task = await updateScheduledTask(taskId, {
    name, emoji, due_date, due_time, category, notes,
    notify_enabled: typeof notify_enabled === "boolean" ? notify_enabled : undefined,
    notify_date: notify_date !== undefined ? (notify_date || null) : undefined,
    notify_time: notify_time !== undefined ? (notify_time || null) : undefined,
    notify_repeat: typeof notify_repeat === "boolean" ? notify_repeat : undefined,
    notified_at: null,
    notify_sent_count: 0,
  });
  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  await deleteScheduledTask(parseInt(id));
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const task = await getScheduledTask(parseInt(id));
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ task });
}
