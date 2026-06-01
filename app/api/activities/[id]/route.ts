import { NextResponse } from "next/server";
import { getActivity, updateActivity, archiveActivity } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const activity = await getActivity(activityId);
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.frequency && !["daily", "weekly", "free"].includes(body.frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }
  if (body.xp_base !== undefined && (typeof body.xp_base !== "number" || body.xp_base < 1)) {
    return NextResponse.json({ error: "xp_base must be a positive number" }, { status: 400 });
  }

  const updated = await updateActivity(activityId, body);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await archiveActivity(activityId);
  return NextResponse.json({ success: true });
}
