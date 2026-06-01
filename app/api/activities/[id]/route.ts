import { NextResponse } from "next/server";
import { getActivity, updateActivity, archiveActivity } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const activity = getActivity(activityId);
  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = updateActivity(activityId, body);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  archiveActivity(activityId);
  return NextResponse.json({ success: true });
}
