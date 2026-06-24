import { NextResponse } from "next/server";
import { countTodayPendingTasks } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ count: 0 });
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const count = await countTodayPendingTasks(todayStr);
  return NextResponse.json({ count });
}
