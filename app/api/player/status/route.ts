import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/db";
import { getLevelInfo } from "@/lib/gamification";
import { isAuthed } from "@/lib/auth";

function getLevelTitle(level: number): string {
  if (level < 5)   return "E-RANK";
  if (level < 10)  return "D-RANK";
  if (level < 15)  return "C-RANK";
  if (level < 20)  return "B-RANK";
  if (level < 30)  return "A-RANK";
  if (level < 50)  return "S-RANK";
  if (level < 80)  return "NACIONAL";
  if (level < 100) return "MONARCA";
  return "REI DAS SOMBRAS";
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json(null);
  const stats = await getUserStats();
  const levelInfo = getLevelInfo(stats.total_xp);
  return NextResponse.json({ ...levelInfo, rank: getLevelTitle(levelInfo.level) });
}
