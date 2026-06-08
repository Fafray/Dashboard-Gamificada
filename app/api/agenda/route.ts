import { NextRequest, NextResponse } from "next/server";
import { getScheduledTasks, createScheduledTask } from "@/lib/db";

export async function GET(req: NextRequest) {
  const includeCompleted = req.nextUrl.searchParams.get("completed") === "1";
  const tasks = await getScheduledTasks(includeCompleted);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, emoji, due_date, due_time, category, notes } = body;
  if (!name || !due_date) {
    return NextResponse.json({ error: "name e due_date são obrigatórios" }, { status: 400 });
  }
  const task = await createScheduledTask({ name, emoji, due_date, due_time, category, notes });
  return NextResponse.json({ task }, { status: 201 });
}
