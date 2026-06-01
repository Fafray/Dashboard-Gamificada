import { getActivities } from "@/lib/db";
import { ActivitiesManager } from "./ActivitiesManager";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const all = await getActivities(true);
  const active = all.filter((a) => !a.archived);
  const archived = all.filter((a) => a.archived);
  return <ActivitiesManager active={active} archived={archived} />;
}
