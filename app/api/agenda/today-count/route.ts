import { NextResponse } from "next/server";
import { countTodayPendingTasks } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const count = await countTodayPendingTasks(todayStr);
  return NextResponse.json({ count });
}
