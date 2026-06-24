import { getScheduledTasks } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { AgendaClient } from "@/components/AgendaClient";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const tasks = await getScheduledTasks(true);
  return <AgendaClient initialTasks={tasks} />;
}
