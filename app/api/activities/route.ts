import { NextResponse } from "next/server";
import { getActivities, createActivity, clearOtherKeystones } from "@/lib/db";

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
  if (!["daily", "weekly", "free", "nx_week"].includes(frequency)) {
    return NextResponse.json({ error: "frequency must be daily, weekly, free, or nx_week" }, { status: 400 });
  }

  const { weekly_target, target_value, target_unit, categoria, micro_version, anchor_context, is_keystone, scheduled_days } = body;

  const activity = await createActivity({
    name,
    frequency,
    xp_base:        xp_base ?? 10,
    emoji:          emoji ?? null,
    color:          color ?? "#7c3aed",
    weekly_target:  weekly_target ?? null,
    target_value:   target_value ?? null,
    target_unit:    target_unit ?? null,
    categoria:      categoria ?? null,
    micro_version:  micro_version ?? null,
    anchor_context: anchor_context ?? null,
    is_keystone:    is_keystone ?? false,
    graduation_count: 0,
    scheduled_days: scheduled_days ?? null,
  });

  if (activity.is_keystone) {
    await clearOtherKeystones(activity.id);
  }

  return NextResponse.json(activity, { status: 201 });
}
