import { NextResponse } from "next/server";
import { getActivity, updateActivity, archiveActivity, deleteActivityPermanently } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const activity = await getActivity(activityId);
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.frequency && !["daily", "weekly", "free", "nx_week", "once"].includes(body.frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  const updated = await updateActivity(activityId, body);
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const url = new URL(req.url);
  if (url.searchParams.get("permanent") === "true") {
    await deleteActivityPermanently(activityId);
  } else {
    await archiveActivity(activityId);
  }
  return NextResponse.json({ success: true });
}
