import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { format } from "date-fns";
import { getActivity, accumulateCheckinValue } from "@/lib/db";

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  const { activity_id, increment } = body;

  if (!activity_id || typeof increment !== "number" || increment <= 0) {
    return NextResponse.json({ error: "activity_id and positive increment required" }, { status: 400 });
  }

  const activity = await getActivity(activity_id);
  if (!activity || !activity.target_value) {
    return NextResponse.json({ error: "Activity not found or has no target" }, { status: 404 });
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const result = await accumulateCheckinValue(activity_id, todayStr, increment);
  const targetReached = result.actual_value >= activity.target_value;

  return NextResponse.json({
    total: result.actual_value,
    targetReached,
    checkinId: result.id,
  });
}
