import { NextResponse } from "next/server";
import { deleteCheckin, getUserStats } from "@/lib/db";
import { getLevelInfo } from "@/lib/gamification";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checkinId = parseInt(id);
  if (isNaN(checkinId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const xpSubtracted = await deleteCheckin(checkinId);
  if (xpSubtracted === 0) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  const stats = await getUserStats();
  const levelInfo = getLevelInfo(stats.total_xp);

  return NextResponse.json({ xpSubtracted, levelInfo });
}
