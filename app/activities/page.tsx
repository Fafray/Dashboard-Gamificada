import { getActivities } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { ActivitiesManager } from "./ActivitiesManager";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const all = await getActivities(true);
  const active = all.filter((a) => !a.archived);
  const archived = all.filter((a) => a.archived);
  return <ActivitiesManager active={active} archived={archived} />;
}
