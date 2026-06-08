import { NextRequest, NextResponse } from "next/server";
import { updateScheduledTask, deleteScheduledTask, getScheduledTask } from "@/lib/db";

function localISOString() {
  const d = new Date();
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { name, emoji, due_date, due_time, category, notes } = body;
  const task = await updateScheduledTask(taskId, { name, emoji, due_date, due_time, category, notes });
  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteScheduledTask(parseInt(id));
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getScheduledTask(parseInt(id));
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ task });
}
