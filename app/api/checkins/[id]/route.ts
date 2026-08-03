import { NextResponse } from "next/server";
import { deleteCheckin } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const checkinId = parseInt(id);
  if (isNaN(checkinId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const deleted = await deleteCheckin(checkinId);
  if (!deleted) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
