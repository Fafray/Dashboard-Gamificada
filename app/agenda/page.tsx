import { getScheduledTasks } from "@/lib/db";
import { AgendaClient } from "@/components/AgendaClient";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const tasks = await getScheduledTasks(true);
  return <AgendaClient initialTasks={tasks} />;
}
