import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDatesWithEntriesInRange } from "@/lib/db";

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json([]);
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  const dates = await getDatesWithEntriesInRange(start, end);
  return NextResponse.json(dates);
}
