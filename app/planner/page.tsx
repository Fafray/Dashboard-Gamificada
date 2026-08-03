import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { format } from "date-fns";
import { getHourlyPlansForDate } from "@/lib/db";
import { getHourlySuggestions } from "@/lib/plannerSuggestions";
import { PlannerClient } from "@/components/PlannerClient";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [rows, suggestions] = await Promise.all([
    getHourlyPlansForDate(todayStr),
    getHourlySuggestions(todayStr),
  ]);

  return <PlannerClient initialDate={todayStr} initialRows={rows} initialSuggestions={suggestions} />;
}
