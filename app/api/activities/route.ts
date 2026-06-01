import { NextResponse } from "next/server";
import { getActivities, createActivity } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("include_archived") === "true";
  const activities = await getActivities(includeArchived);
  return NextResponse.json(activities);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, frequency, xp_base, emoji, color } = body;

  if (!name || !frequency) {
    return NextResponse.json({ error: "name and frequency are required" }, { status: 400 });
  }
  if (!["daily", "weekly", "free"].includes(frequency)) {
    return NextResponse.json({ error: "frequency must be daily, weekly, or free" }, { status: 400 });
  }

  const activity = await createActivity({
    name,
    frequency,
    xp_base: xp_base ?? 10,
    emoji: emoji ?? null,
    color: color ?? "#7c3aed",
  });

  return NextResponse.json(activity, { status: 201 });
}
